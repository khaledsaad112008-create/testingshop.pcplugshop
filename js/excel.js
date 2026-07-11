/* ==========================================================================
   PLUG — Reports page + Excel export (SheetJS)
   ========================================================================== */

function renderReportsStats() {
  const products = getProducts();
  const totalProducts = document.getElementById("reportTotalProducts");
  const totalStockValue = document.getElementById("reportStockValue");
  const totalUnits = document.getElementById("reportTotalUnits");
  if (!totalProducts) return;

  const stockValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const units = products.reduce((sum, p) => sum + p.stock, 0);

  totalProducts.textContent = products.length;
  totalStockValue.textContent = formatPrice(stockValue);
  totalUnits.textContent = units;
}

function renderReportsTable() {
  const tbody = document.getElementById("reportsBody");
  if (!tbody) return;
  const products = getProducts();

  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-text-faint);padding:32px;">No products to report.</td></tr>`;
    return;
  }

  tbody.innerHTML = products
    .map(
      (p) => `
      <tr>
        <td><img class="thumb-sm" src="${p.image}" alt="${escapeHtml(p.name)}" /></td>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.category)}</td>
        <td>${formatPrice(p.price)}</td>
        <td>${p.stock}</td>
        <td>${formatPrice(p.price * p.stock)}</td>
        <td>${escapeHtml(p.id)}</td>
      </tr>
    `
    )
    .join("");
}

function exportProductsToExcel() {
  const products = getProducts();

  const rows = products.map((p) => ({
    ID: p.id,
    Name: p.name,
    Category: p.category,
    "Price ($)": p.price,
    Stock: p.stock,
    "Stock Value ($)": Number((p.price * p.stock).toFixed(2)),
    Description: p.description || "",
    Image: p.image,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 32 },
    { wch: 16 },
    { wch: 10 },
    { wch: 8 },
    { wch: 14 },
    { wch: 40 },
    { wch: 40 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `pc-plug-products-report-${dateStr}.xlsx`);
}

function initReportsPage() {
  requireAdminAuth();
  renderReportsStats();
  renderReportsTable();

  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) exportBtn.addEventListener("click", exportProductsToExcel);

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", (e) => { e.preventDefault(); adminLogout(); });
}
