/* ==========================================================================
   PLUG — Sales log data + localStorage logic (mirrors js/products.js)

   Every sale is tagged with a "month" bucket (YYYY-MM, local time). A sale
   does NOT need to reference a real catalog product — name/category/price
   are always free-editable so a product that was never added to the site,
   or whose price only held for one month, can still be logged accurately.
   ========================================================================== */

const SALES_KEY = "pc_plug_sales_v1";
const SALES_DIRTY_KEY = "pc_plug_sales_dirty";
const SALES_LAST_SYNC_KEY = "pc_plug_sales_last_sync";
const SALES_LAST_SEEN_MONTH_KEY = "pc_plug_sales_last_seen_month";

function salesDataFilePath(name) {
  return window.location.pathname.includes("/admin/") ? `../data/${name}` : `data/${name}`;
}

function isSalesDraftDirty() {
  return localStorage.getItem(SALES_DIRTY_KEY) === "true";
}

function markSalesDraftDirty() {
  localStorage.setItem(SALES_DIRTY_KEY, "true");
}

/* Pulls the published sales log on every load, unless this browser has
   unsaved local edits (dirty flag) that would otherwise be clobbered. */
async function loadSales() {
  if (isSalesDraftDirty() && localStorage.getItem(SALES_KEY)) return;
  const path = salesDataFilePath("sales.json");
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error("not found");
    const data = await res.json();
    localStorage.setItem(SALES_KEY, JSON.stringify(data));
    localStorage.setItem(SALES_LAST_SYNC_KEY, JSON.stringify({
      count: data.length,
      url: new URL(path, window.location.href).href,
      time: Date.now(),
    }));
  } catch (e) {
    if (!localStorage.getItem(SALES_KEY)) localStorage.setItem(SALES_KEY, JSON.stringify([]));
  }
}

function getSalesLastSyncInfo() {
  try {
    return JSON.parse(localStorage.getItem(SALES_LAST_SYNC_KEY));
  } catch (e) {
    return null;
  }
}

/* ---------- Month helpers ---------- */
function monthKeyOf(dateStr) {
  return (dateStr || "").slice(0, 7);
}

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
  try {
    return JSON.parse(localStorage.getItem(SALES_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveSales(sales) {
  localStorage.setItem(SALES_KEY, JSON.stringify(sales));
  markSalesDraftDirty();
}

function generateSaleId() {
  return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function addSale(data) {
  const sales = getSales();
  const date = data.date || todayDateStr();
  const quantity = Number(data.quantity) || 0;
  const unitPrice = Number(data.unitPrice) || 0;
  const sale = {
    id: generateSaleId(),
    date,
    month: monthKeyOf(date),
    productId: data.productId || null,
    name: data.name,
    category: data.category || "Uncategorized",
    quantity,
    unitPrice,
    total: Number((quantity * unitPrice).toFixed(2)),
    note: data.note || "",
    loggedAt: Date.now(),
  };
  sales.push(sale);
  saveSales(sales);
  return sale;
}

function updateSale(id, updates) {
  const sales = getSales();
  const idx = sales.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  const merged = { ...sales[idx], ...updates };
  if (updates.date) merged.month = monthKeyOf(updates.date);
  if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
    merged.total = Number((Number(merged.quantity) * Number(merged.unitPrice)).toFixed(2));
  }
  sales[idx] = merged;
  saveSales(sales);
  return merged;
}

function deleteSale(id) {
  const sales = getSales().filter((s) => s.id !== id);
  saveSales(sales);
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

/* ---------- Excel export (SheetJS, loaded via CDN on the sales page) ---------- */
function buildSalesWorkbook(sales, sheetName) {
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
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Sales");
  return workbook;
}

function exportSalesMonthToExcel(monthKey) {
  const sales = getSalesForMonth(monthKey).sort((a, b) => a.date.localeCompare(b.date));
  if (!sales.length) return false;
  const workbook = buildSalesWorkbook(sales, monthKey);
  XLSX.writeFile(workbook, `pc-plug-sales-${monthKey}.xlsx`);
  return true;
}

/* ---------- Month rollover ----------
   Detects when the wall-clock month has moved on since the admin last opened
   the sales page in this browser. If so, auto-downloads last month's report
   locally (the "start fresh with the other month" behaviour) — the closed
   month's data itself is never deleted, just no longer the active bucket. */
function checkSalesMonthRollover() {
  const seen = localStorage.getItem(SALES_LAST_SEEN_MONTH_KEY);
  const current = currentMonthKey();
  localStorage.setItem(SALES_LAST_SEEN_MONTH_KEY, current);
  if (!seen || seen === current) return null;
  const exported = exportSalesMonthToExcel(seen);
  return { closedMonth: seen, exported };
}

/* ---------- Sync to GitHub (mirrors publishToDatabase in js/admin.js) ---------- */
async function syncSalesToGitHub() {
  const sales = getSales();
  const res = await fetch("/admin/api/sales/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sales }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("Not authenticated with Cloudflare Access, or your session expired. Reload the page and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.ok) {
    const error = data && data.error;
    const reason = error === "conflict"
      ? "The published sales log changed since you last loaded it. Reload the page to get the latest version, then redo your edit."
      : error === "invalid_payload"
      ? "Nothing to sync, or the data looked invalid — no commit was made."
      : error === "auth"
      ? "Sync failed: the publish service rejected its own GitHub credentials."
      : "Sync failed (network or server error). Nothing was changed on the live site — safe to retry.";
    throw new Error(reason);
  }

  markSalesSynced(data);
  return data;
}

function markSalesSynced(data) {
  localStorage.removeItem(SALES_DIRTY_KEY);
  localStorage.setItem(SALES_LAST_SYNC_KEY, JSON.stringify({
    count: data.count,
    url: `https://github.com/khaledsaad112008-create/testingshop.pcplugshop/commit/${data.commitSha}`,
    time: Date.now(),
    publish: true,
  }));
}
