/* ==========================================================================
   PLUG — Sales page UI logic (admin/sales.html)
   ========================================================================== */

let editingSaleId = null;

function renderSalesStats() {
  const monthKey = currentMonthKey();
  const label = document.getElementById("currentMonthLabel");
  if (label) label.textContent = monthLabel(monthKey);

  const totals = monthTotals(getSalesForMonth(monthKey));
  document.getElementById("statMonthRevenue").textContent = formatPrice(totals.revenue);
  document.getElementById("statMonthUnits").textContent = totals.units;
  document.getElementById("statMonthCount").textContent = totals.count;
}

function saleRowView(s) {
  return `
    <tr data-id="${s.id}">
      <td>${escapeHtml(s.date)}</td>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.category)}</td>
      <td>${s.quantity}</td>
      <td>${formatPrice(s.unitPrice)}</td>
      <td>${formatPrice(s.total)}</td>
      <td>${escapeHtml(s.note || "")}</td>
      <td class="actions-cell">
        <button class="btn btn-outline btn-sm edit-btn">Edit</button>
        <button class="btn btn-danger btn-sm delete-btn">Delete</button>
      </td>
    </tr>
  `;
}

function saleRowEdit(s) {
  return `
    <tr data-id="${s.id}" class="editing-row">
      <td><input type="date" class="edit-date" value="${s.date}" /></td>
      <td><input type="text" class="edit-name" value="${escapeHtml(s.name)}" /></td>
      <td><input type="text" class="edit-category" value="${escapeHtml(s.category)}" list="categoryList" /></td>
      <td><input type="number" class="edit-quantity" value="${s.quantity}" min="1" step="1" /></td>
      <td><input type="number" class="edit-unitPrice" value="${s.unitPrice}" min="0" step="0.01" /></td>
      <td>${formatPrice(s.total)}</td>
      <td><input type="text" class="edit-note" value="${escapeHtml(s.note || "")}" /></td>
      <td class="actions-cell">
        <button class="btn btn-primary btn-sm save-btn">Save</button>
        <button class="btn btn-outline btn-sm cancel-btn">Cancel</button>
      </td>
    </tr>
  `;
}

function renderCurrentMonthTable() {
  const tbody = document.getElementById("currentMonthBody");
  if (!tbody) return;
  const sales = getSalesForMonth(currentMonthKey()).sort((a, b) => b.date.localeCompare(a.date) || b.loggedAt - a.loggedAt);

  if (!sales.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--color-text-faint);padding:32px;">No sales logged this month yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = sales.map((s) => (s.id === editingSaleId ? saleRowEdit(s) : saleRowView(s))).join("");
}

function renderArchiveTable() {
  const tbody = document.getElementById("archiveBody");
  if (!tbody) return;
  const current = currentMonthKey();
  const months = getMonthKeys().filter((m) => m !== current);

  if (!months.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--color-text-faint);padding:32px;">No closed-out months yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = months
    .map((m) => {
      const totals = monthTotals(getSalesForMonth(m));
      return `
        <tr data-month="${m}">
          <td>${monthLabel(m)}</td>
          <td>${formatPrice(totals.revenue)}</td>
          <td>${totals.units}</td>
          <td>${totals.count}</td>
          <td class="actions-cell">
            <button class="btn btn-outline btn-sm archive-export-btn">⬇ Download .xlsx</button>
            <button class="btn btn-primary btn-sm archive-force-export-btn">⚡ Sync &amp; Export</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderAll() {
  renderSalesStats();
  renderCurrentMonthTable();
  renderArchiveTable();
}

function initSaleForm() {
  const form = document.getElementById("addSaleForm");
  if (!form) return;

  const nameInput = document.getElementById("saleName");
  const categoryInput = document.getElementById("saleCategory");
  const priceInput = document.getElementById("saleUnitPrice");
  const dateInput = document.getElementById("saleDate");
  const productList = document.getElementById("saleProductList");

  dateInput.value = todayDateStr();

  const products = getProducts();
  productList.innerHTML = products.map((p) => `<option value="${escapeHtml(p.name)}"></option>`).join("");

  nameInput.addEventListener("input", () => {
    const match = products.find((p) => p.name === nameInput.value);
    if (match) {
      categoryInput.value = match.category;
      if (!priceInput.value) priceInput.value = match.price;
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const category = categoryInput.value.trim();
    const date = dateInput.value || todayDateStr();
    const unitPrice = priceInput.value;
    const quantity = document.getElementById("saleQuantity").value;
    const note = document.getElementById("saleNote").value.trim();

    if (!name || !category || unitPrice === "" || quantity === "") return;

    const match = products.find((p) => p.name === name);
    addSale({ name, category, date, unitPrice, quantity, note, productId: match ? match.id : null });

    form.reset();
    dateInput.value = todayDateStr();
    document.getElementById("saleQuantity").value = 1;
    renderAll();
  });
}

function initSalesTable() {
  const tbody = document.getElementById("currentMonthBody");
  if (!tbody) return;

  tbody.addEventListener("click", (e) => {
    const row = e.target.closest("tr");
    if (!row || !row.dataset.id) return;
    const id = row.dataset.id;

    if (e.target.closest(".edit-btn")) {
      editingSaleId = id;
      renderCurrentMonthTable();
      return;
    }

    if (e.target.closest(".cancel-btn")) {
      editingSaleId = null;
      renderCurrentMonthTable();
      return;
    }

    if (e.target.closest(".delete-btn")) {
      if (confirm("Delete this sale? This cannot be undone.")) {
        deleteSale(id);
        renderAll();
      }
      return;
    }

    if (e.target.closest(".save-btn")) {
      const date = row.querySelector(".edit-date").value;
      const name = row.querySelector(".edit-name").value.trim();
      const category = row.querySelector(".edit-category").value.trim();
      const quantity = row.querySelector(".edit-quantity").value;
      const unitPrice = row.querySelector(".edit-unitPrice").value;
      const note = row.querySelector(".edit-note").value.trim();

      if (!name || !category || quantity === "" || unitPrice === "") return;

      updateSale(id, { date, name, category, quantity: Number(quantity), unitPrice: Number(unitPrice), note });
      editingSaleId = null;
      renderAll();
      return;
    }
  });
}

function initArchiveTable() {
  const tbody = document.getElementById("archiveBody");
  if (!tbody) return;
  tbody.addEventListener("click", async (e) => {
    const row = e.target.closest("tr");
    if (!row) return;
    const monthKey = row.dataset.month;

    if (e.target.closest(".archive-export-btn")) {
      const exported = exportSalesMonthToExcel(monthKey);
      if (!exported) alert("No sales found for that month.");
      return;
    }

    const forceBtn = e.target.closest(".archive-force-export-btn");
    if (forceBtn) {
      if (!confirm(`Sync all local sales and regenerate sales-reports/${monthKey}.xlsx on GitHub now?`)) return;
      forceBtn.disabled = true;
      forceBtn.textContent = "Working…";
      try {
        const result = await syncAndExportSalesMonth(monthKey);
        renderSalesSyncStatus();
        alert(
          result.skipped
            ? `No sales found for ${monthLabel(monthKey)} in the synced data — nothing to export.`
            : `sales-reports/${monthKey}.xlsx updated on GitHub (${result.count} entries).`
        );
      } catch (err) {
        alert(err.message);
      } finally {
        forceBtn.disabled = false;
        forceBtn.innerHTML = "⚡ Sync &amp; Export";
      }
    }
  });
}

function renderSalesSyncStatus() {
  const el = document.getElementById("salesSyncStatus");
  if (!el) return;
  const info = getSalesLastSyncInfo();
  if (!info) {
    el.textContent = "";
    return;
  }
  const time = new Date(info.time).toLocaleTimeString();
  if (info.publish) {
    el.innerHTML = `Synced to GitHub at ${time} — ${info.count} sales. ` +
      `<a href="${info.url}" target="_blank" rel="noopener">View commit</a>.`;
    return;
  }
  el.textContent = `Last loaded ${info.count} sales at ${time}.`;
}

function initSalesPage() {
  const rollover = checkSalesMonthRollover();
  if (rollover && rollover.exported) {
    alert(`${monthLabel(rollover.closedMonth)} closed out — its sales report downloaded automatically.`);
  }

  renderAll();
  renderSalesSyncStatus();
  initSaleForm();
  initSalesTable();
  initArchiveTable();

  const exportBtn = document.getElementById("exportMonthBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const exported = exportSalesMonthToExcel(currentMonthKey());
      if (!exported) alert("No sales logged this month yet.");
    });
  }

  const syncBtn = document.getElementById("syncSalesBtn");
  if (syncBtn) {
    syncBtn.addEventListener("click", async () => {
      if (!confirm("Sync the full sales log to the live site now? This commits data/sales.json directly to main.")) return;
      syncBtn.disabled = true;
      syncBtn.textContent = "Syncing…";
      try {
        const data = await syncSalesToGitHub();
        renderSalesSyncStatus();
        alert(`Synced ${data.count} sales to main.`);
      } catch (err) {
        alert(err.message);
      } finally {
        syncBtn.disabled = false;
        syncBtn.textContent = "⬆ Sync to GitHub";
      }
    });
  }

  const forceExportBtn = document.getElementById("forceExportMonthBtn");
  if (forceExportBtn) {
    forceExportBtn.addEventListener("click", async () => {
      const monthKey = currentMonthKey();
      if (!confirm(`Sync all local sales and generate sales-reports/${monthKey}.xlsx on GitHub right now?`)) return;
      forceExportBtn.disabled = true;
      forceExportBtn.textContent = "Working…";
      try {
        const result = await syncAndExportSalesMonth(monthKey);
        renderSalesSyncStatus();
        alert(
          result.skipped
            ? `No sales logged for ${monthLabel(monthKey)} yet — nothing to export.`
            : `sales-reports/${monthKey}.xlsx updated on GitHub (${result.count} entries).`
        );
      } catch (err) {
        alert(err.message);
      } finally {
        forceExportBtn.disabled = false;
        forceExportBtn.innerHTML = "⚡ Sync &amp; Export to GitHub Now";
      }
    });
  }
}
