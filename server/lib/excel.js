/* Builds and writes monthly sales .xlsx reports to sales-reports/YYYY-MM.xlsx.
   Single source of truth for report generation — used by the startup/cron
   catch-up check (lib/cron.js) and the manual "regenerate" API route. Reuses
   the same `xlsx` (SheetJS) dependency the project already has; no new
   reporting tooling introduced. */

const path = require("path");
const fs = require("fs/promises");
const XLSX = require("xlsx");
const { REPO_ROOT, readSales, writeFileAtomic } = require("./dataStore");

const REPORTS_DIR = path.join(REPO_ROOT, "sales-reports");

function reportPath(monthKey) {
  return path.join(REPORTS_DIR, `${monthKey}.xlsx`);
}

async function reportExists(monthKey) {
  try {
    await fs.access(reportPath(monthKey));
    return true;
  } catch (e) {
    return false;
  }
}

function buildWorkbook(sales, sheetName) {
  const rows = sales.map((s) => ({
    Date: s.date,
    Product: s.name,
    Category: s.category,
    Quantity: s.quantity,
    "Unit Price (QAR)": s.unitPrice,
    "Total (QAR)": s.total,
    Note: s.note || "",
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 12 }, { wch: 32 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return workbook;
}

/* Generates (or regenerates) the report for a given month from whatever is
   currently in data/sales.json. Returns { skipped: true } if there's nothing
   to report for that month — no empty files get written. */
async function generateMonthReport(monthKey) {
  const sales = (await readSales())
    .filter((s) => (s.date || "").slice(0, 7) === monthKey)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!sales.length) return { ok: true, skipped: true, monthKey };

  const workbook = buildWorkbook(sales, monthKey);
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  await writeFileAtomic(reportPath(monthKey), buffer);

  return { ok: true, monthKey, count: sales.length };
}

module.exports = { REPORTS_DIR, reportPath, reportExists, generateMonthReport };
