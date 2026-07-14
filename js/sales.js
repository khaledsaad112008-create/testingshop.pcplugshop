/* ==========================================================================
   PLUG — Sales log data + local server API logic (mirrors js/products.js)

   Every sale is tagged with a "month" bucket (YYYY-MM, local time). A sale
   does NOT need to reference a real catalog product — name/category/price
   are always free-editable so a product that was never added to the site,
   or whose price only held for one month, can still be logged accurately.
   ========================================================================== */

/* In-memory only — the local server is the source of truth. */
let _sales = [];

async function loadSales() {
  try {
    const res = await fetch("/admin/api/sales", { cache: "no-store" });
    _sales = await res.json();
  } catch (e) {
    _sales = _sales || [];
  }
}

/* ---------- Month helpers ---------- */
function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthLabel(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/* ---------- CRUD ---------- */
function getSales() {
  return _sales;
}

async function addSale(data) {
  const res = await fetch("/admin/api/sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to log sale. Check your connection and try again.");
  const sale = await res.json();
  _sales.push(sale);
  return sale;
}

async function updateSale(id, updates) {
  const res = await fetch(`/admin/api/sales/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update sale. Check your connection and try again.");
  const sale = await res.json();
  const idx = _sales.findIndex((s) => s.id === id);
  if (idx !== -1) _sales[idx] = sale;
  return sale;
}

async function deleteSale(id) {
  const res = await fetch(`/admin/api/sales/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete sale. Check your connection and try again.");
  _sales = _sales.filter((s) => s.id !== id);
}

function getSalesForMonth(monthKey) {
  return getSales().filter((s) => s.month === monthKey);
}

function getMonthKeys() {
  const keys = new Set(getSales().map((s) => s.month));
  return Array.from(keys).sort().reverse();
}

function monthTotals(sales) {
  const revenue = sales.reduce((sum, s) => sum + s.total, 0);
  const units = sales.reduce((sum, s) => sum + s.quantity, 0);
  return { revenue, units, count: sales.length };
}

/* Downloads an already-generated report straight from the server — not a
   client-side generation step, just fetching an existing file. */
function downloadSalesReport(monthKey) {
  window.location.href = `/admin/api/sales-reports/${encodeURIComponent(monthKey)}`;
}

/* Forces the server to (re)generate a month's report right now, instead of
   waiting for its automatic startup/periodic catch-up check. Useful right
   after correcting a past sale, or to confirm the pipeline works without
   waiting for the 1st of the month. */
async function forceExportSalesMonth(monthKey) {
  const res = await fetch("/admin/api/sales/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ monthKey }),
  });
  if (!res.ok) throw new Error("Export failed (network or server error). Safe to retry.");
  return res.json();
}
