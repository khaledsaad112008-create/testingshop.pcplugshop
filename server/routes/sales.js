const express = require("express");
const fs = require("fs");
const { readSales, writeSales } = require("../lib/dataStore");
const { generateMonthReport, reportPath, reportExists } = require("../lib/excel");
const gitSync = require("../lib/git");

function generateId() {
  return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKeyOf(dateStr) {
  return (dateStr || "").slice(0, 7);
}

/* /admin/api/sales — all admin-only, behind Cloudflare Access. Sales data
   (revenue) has no public read use case. */
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    res.json(await readSales());
  } catch (e) {
    res.status(500).json({ ok: false, error: "read_failed", detail: e.message });
  }
});

router.post("/", async (req, res) => {
  const body = req.body || {};
  const date = body.date || todayDateStr();
  const quantity = Number(body.quantity) || 0;
  const unitPrice = Number(body.unitPrice) || 0;

  if (!body.name || !body.category || !quantity) {
    return res.status(400).json({ ok: false, error: "invalid_payload", detail: "name, category, and quantity are required" });
  }

  const sale = {
    id: generateId(),
    date,
    month: monthKeyOf(date),
    productId: body.productId || null,
    name: String(body.name).trim(),
    category: String(body.category).trim(),
    quantity,
    unitPrice,
    total: Number((quantity * unitPrice).toFixed(2)),
    note: String(body.note || "").trim(),
    loggedAt: Date.now(),
  };

  const sales = await readSales();
  sales.push(sale);
  await writeSales(sales);
  gitSync.syncPaths(["data/sales.json"], `Log sale: ${sale.name} (${sale.date})`);
  res.status(201).json(sale);
});

router.put("/:id", async (req, res) => {
  const sales = await readSales();
  const idx = sales.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: "not_found" });

  const updates = req.body || {};
  const merged = { ...sales[idx], ...updates, id: sales[idx].id };
  if (updates.date) merged.month = monthKeyOf(updates.date);
  if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
    merged.total = Number((Number(merged.quantity) * Number(merged.unitPrice)).toFixed(2));
  }

  sales[idx] = merged;
  await writeSales(sales);
  gitSync.syncPaths(["data/sales.json"], `Update sale: ${merged.name} (${merged.date})`);
  res.json(merged);
});

router.delete("/:id", async (req, res) => {
  const sales = await readSales();
  const sale = sales.find((s) => s.id === req.params.id);
  if (!sale) return res.status(404).json({ ok: false, error: "not_found" });

  const remaining = sales.filter((s) => s.id !== req.params.id);
  await writeSales(remaining);
  gitSync.syncPaths(["data/sales.json"], `Delete sale: ${sale.name} (${sale.date})`);
  res.json({ ok: true });
});

/* Manual "regenerate this month's report now" — a safety-net trigger, not a
   client-side download prompt. Forces the same automation the startup/cron
   catch-up check runs, on demand (e.g. right after correcting a past sale). */
router.post("/export", async (req, res) => {
  const monthKey = req.body && req.body.monthKey;
  if (!/^\d{4}-\d{2}$/.test(monthKey || "")) {
    return res.status(400).json({ ok: false, error: "invalid_payload", detail: "monthKey must be YYYY-MM" });
  }

  try {
    const result = await generateMonthReport(monthKey);
    if (!result.skipped) {
      gitSync.syncPaths([`sales-reports/${monthKey}.xlsx`], `Generate ${monthKey} sales report (${result.count} entries)`);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: "export_failed", detail: e.message });
  }
});

/* /admin/api/sales-reports/:month — downloads an already-generated report
   file straight off disk. Not a generation step, just fetching an artifact
   the cron/export already produced. */
const reportsRouter = express.Router();

reportsRouter.get("/:month", async (req, res) => {
  const monthKey = req.params.month;
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    return res.status(400).json({ ok: false, error: "invalid_payload", detail: "month must be YYYY-MM" });
  }
  if (!(await reportExists(monthKey))) {
    return res.status(404).json({ ok: false, error: "not_found", detail: "No report generated for that month yet" });
  }
  res.download(reportPath(monthKey), `pc-plug-sales-${monthKey}.xlsx`);
});

module.exports = { router, reportsRouter };
