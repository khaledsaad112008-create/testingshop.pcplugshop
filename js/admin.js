/* ==========================================================================
   PC PLUG — Admin CRUD logic + security layer

   This is a static, client-only site: the password (even hashed) ships in
   the JS bundle anyone can download, so this is "raise the bar" security
   (hashing, lockout, inactivity expiry), not true access control. For real
   protection once this is deployed to a domain, put the /admin/ path behind
   server-side auth (e.g. HTTP Basic Auth via your host's config) in addition
   to this.
   ========================================================================== */

// SHA-256 of the admin password — change this hash to change the password.
// Never put the plaintext password in this file.
const ADMIN_PASSWORD_HASH = "b3c2316b9efffb6ac1b34924111b5e9df9d4f1e93b221274a8919a233c160ffe";

const ADMIN_SESSION_KEY = "pc_plug_admin_session";
const ADMIN_LAST_ACTIVITY_KEY = "pc_plug_admin_last_activity";
const ADMIN_ATTEMPTS_KEY = "pc_plug_admin_attempts";
const ADMIN_LOCK_UNTIL_KEY = "pc_plug_admin_lock_until";
const ADMIN_LOGOUT_MSG_KEY = "pc_plug_admin_logout_msg";

const SESSION_TIMEOUT_MS = 20 * 60 * 1000; // auto-logout after 20 min inactivity
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // 60s lockout after too many failed attempts

async function sha256Hex(text) {
  if (!window.crypto || !window.crypto.subtle) return null;
  const data = new TextEncoder().encode(text);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------- Auth ---------- */
function isAdminLoggedIn() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

function touchActivity() {
  sessionStorage.setItem(ADMIN_LAST_ACTIVITY_KEY, String(Date.now()));
}

let lastActivityTouch = 0;
function throttledTouchActivity() {
  const now = Date.now();
  if (now - lastActivityTouch > 5000) {
    lastActivityTouch = now;
    touchActivity();
  }
}

function initActivityTracking() {
  ["click", "keydown", "mousemove", "scroll"].forEach((evt) => {
    document.addEventListener(evt, throttledTouchActivity, { passive: true });
  });
  setInterval(() => {
    const last = Number(sessionStorage.getItem(ADMIN_LAST_ACTIVITY_KEY)) || 0;
    if (isAdminLoggedIn() && Date.now() - last > SESSION_TIMEOUT_MS) {
      adminLogout("You were logged out after 20 minutes of inactivity.");
    }
  }, 30000);
}

function requireAdminAuth() {
  if (!isAdminLoggedIn()) {
    window.location.href = "login.html";
    return;
  }
  const last = Number(sessionStorage.getItem(ADMIN_LAST_ACTIVITY_KEY)) || 0;
  if (Date.now() - last > SESSION_TIMEOUT_MS) {
    adminLogout("You were logged out after 20 minutes of inactivity.");
    return;
  }
  touchActivity();
  initActivityTracking();
}

function adminLogout(message) {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  sessionStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
  if (message) sessionStorage.setItem(ADMIN_LOGOUT_MSG_KEY, message);
  window.location.href = "login.html";
}

function initLoginPage() {
  if (isAdminLoggedIn()) {
    window.location.href = "dashboard.html";
    return;
  }
  const form = document.getElementById("loginForm");
  const errorEl = document.getElementById("loginError");
  const passwordInput = document.getElementById("passwordInput");
  if (!form) return;
  const submitBtn = form.querySelector('button[type="submit"]');

  const logoutMsg = sessionStorage.getItem(ADMIN_LOGOUT_MSG_KEY);
  if (logoutMsg) {
    errorEl.textContent = logoutMsg;
    sessionStorage.removeItem(ADMIN_LOGOUT_MSG_KEY);
  }

  function checkLockout() {
    const lockUntil = Number(localStorage.getItem(ADMIN_LOCK_UNTIL_KEY)) || 0;
    const remaining = lockUntil - Date.now();
    if (remaining > 0) {
      submitBtn.disabled = true;
      passwordInput.disabled = true;
      errorEl.textContent = `Too many failed attempts. Try again in ${Math.ceil(remaining / 1000)}s.`;
      setTimeout(checkLockout, 1000);
      return true;
    }
    submitBtn.disabled = false;
    passwordInput.disabled = false;
    return false;
  }

  if (checkLockout()) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (checkLockout()) return;

    const password = passwordInput.value;
    const hash = await sha256Hex(password);

    if (!hash) {
      errorEl.textContent = "Your browser doesn't support secure login (requires HTTPS). Please use a modern browser over HTTPS.";
      return;
    }

    if (hash === ADMIN_PASSWORD_HASH) {
      localStorage.removeItem(ADMIN_ATTEMPTS_KEY);
      localStorage.removeItem(ADMIN_LOCK_UNTIL_KEY);
      sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
      touchActivity();
      window.location.href = "dashboard.html";
      return;
    }

    const attempts = (Number(localStorage.getItem(ADMIN_ATTEMPTS_KEY)) || 0) + 1;
    localStorage.setItem(ADMIN_ATTEMPTS_KEY, String(attempts));
    passwordInput.value = "";
    passwordInput.focus();

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      localStorage.setItem(ADMIN_LOCK_UNTIL_KEY, String(Date.now() + LOCKOUT_MS));
      localStorage.removeItem(ADMIN_ATTEMPTS_KEY);
      checkLockout();
    } else {
      const left = MAX_LOGIN_ATTEMPTS - attempts;
      errorEl.textContent = `Incorrect password. ${left} attempt${left === 1 ? "" : "s"} remaining.`;
    }
  });
}

/* ---------- Dashboard: stats ---------- */
function renderAdminStats() {
  const products = getProducts();
  const totalProducts = document.getElementById("statTotalProducts");
  const totalStockValue = document.getElementById("statStockValue");
  const totalUnits = document.getElementById("statTotalUnits");
  if (!totalProducts) return;

  const stockValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const units = products.reduce((sum, p) => sum + p.stock, 0);

  totalProducts.textContent = products.length;
  totalStockValue.textContent = formatPrice(stockValue);
  totalUnits.textContent = units;
}

/* ---------- Dashboard: add product form ---------- */
function initAddProductForm() {
  const form = document.getElementById("addProductForm");
  if (!form) return;

  const imageUrlInput = document.getElementById("newImageUrl");
  const imageFileInput = document.getElementById("newImageFile");
  const imagePreview = document.getElementById("newImagePreview");

  function updatePreview() {
    imagePreview.src = imageUrlInput.value || "https://picsum.photos/seed/plug-default/100/100";
  }
  imageUrlInput.addEventListener("input", updatePreview);

  imageFileInput.addEventListener("change", () => {
    const file = imageFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      imageUrlInput.value = reader.result;
      updatePreview();
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("newName").value.trim();
    const price = document.getElementById("newPrice").value;
    const category = document.getElementById("newCategory").value.trim();
    const stock = document.getElementById("newStock").value;
    const image = imageUrlInput.value.trim();
    const description = document.getElementById("newDescription").value.trim();

    if (!name || !category || price === "" || stock === "") return;

    addProduct({ name, price, category, stock, image, description });

    form.reset();
    imagePreview.src = "https://picsum.photos/seed/plug-default/100/100";
    renderAdminStats();
    renderAdminTable();
  });
}

/* ---------- Dashboard: product table with inline edit ---------- */
let editingProductId = null;

function adminTableRowView(p) {
  const status = stockStatus(p.stock);
  const pillCls = status.cls === "" ? "ok" : status.cls;
  return `
    <tr data-id="${p.id}">
      <td><img class="thumb-sm" src="${p.image}" alt="${escapeHtml(p.name)}" /></td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.category)}</td>
      <td>${formatPrice(p.price)}</td>
      <td><span class="stock-pill ${pillCls}">${p.stock}</span></td>
      <td class="actions-cell">
        <button class="btn btn-outline btn-sm edit-btn">Edit</button>
        <button class="btn btn-danger btn-sm delete-btn">Delete</button>
      </td>
    </tr>
  `;
}

function adminTableRowEdit(p) {
  return `
    <tr data-id="${p.id}" class="editing-row">
      <td><img class="thumb-sm" src="${p.image}" alt="${escapeHtml(p.name)}" /></td>
      <td><input type="text" class="edit-name" value="${escapeHtml(p.name)}" /></td>
      <td><input type="text" class="edit-category" value="${escapeHtml(p.category)}" list="categoryList" /></td>
      <td><input type="number" class="edit-price" value="${p.price}" min="0" step="0.01" /></td>
      <td><input type="number" class="edit-stock" value="${p.stock}" min="0" step="1" /></td>
      <td class="actions-cell">
        <button class="btn btn-primary btn-sm save-btn">Save</button>
        <button class="btn btn-outline btn-sm cancel-btn">Cancel</button>
      </td>
    </tr>
  `;
}

function renderAdminTable() {
  const tbody = document.getElementById("adminProductsBody");
  if (!tbody) return;
  const products = getProducts();

  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--color-text-faint);padding:32px;">No products yet. Add your first product above.</td></tr>`;
    return;
  }

  tbody.innerHTML = products
    .map((p) => (p.id === editingProductId ? adminTableRowEdit(p) : adminTableRowView(p)))
    .join("");
}

function initAdminTable() {
  const tbody = document.getElementById("adminProductsBody");
  if (!tbody) return;

  tbody.addEventListener("click", (e) => {
    const row = e.target.closest("tr");
    if (!row) return;
    const id = row.dataset.id;

    if (e.target.closest(".edit-btn")) {
      editingProductId = id;
      renderAdminTable();
      return;
    }

    if (e.target.closest(".cancel-btn")) {
      editingProductId = null;
      renderAdminTable();
      return;
    }

    if (e.target.closest(".delete-btn")) {
      const product = getProductById(id);
      if (confirm(`Delete "${product ? product.name : "this product"}"? This cannot be undone.`)) {
        deleteProduct(id);
        renderAdminStats();
        renderAdminTable();
      }
      return;
    }

    if (e.target.closest(".save-btn")) {
      const name = row.querySelector(".edit-name").value.trim();
      const category = row.querySelector(".edit-category").value.trim();
      const price = row.querySelector(".edit-price").value;
      const stock = row.querySelector(".edit-stock").value;

      if (!name || !category || price === "" || stock === "") return;

      updateProduct(id, {
        name,
        category,
        price: Number(price),
        stock: Number(stock),
      });

      editingProductId = null;
      renderAdminStats();
      renderAdminTable();
      return;
    }
  });
}

/* ---------- Export database ---------- */
function exportProductsDatabase() {
  const blob = new Blob([JSON.stringify(getProducts(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products.json";
  a.click();
  URL.revokeObjectURL(url);
}

/* Shows exactly what the last fetch from data/products.json returned (source
   URL, product count, time) so a stale reload is visible immediately instead
   of looking like nothing happened. */
function renderDbSyncStatus() {
  const el = document.getElementById("dbSyncStatus");
  if (!el) return;
  const info = getLastSyncInfo();
  if (!info) {
    el.textContent = "";
    return;
  }
  const time = new Date(info.time).toLocaleTimeString();
  el.innerHTML = `Last synced from <code>${info.url}</code> at ${time} — ${info.count} products. ` +
    `Fetching from this host: if this is the live site, it only reflects what's been pushed to <code>main</code>, not files replaced on your local disk.`;
}

/* ---------- Dashboard init ---------- */
function initDashboardPage() {
  requireAdminAuth();
  renderAdminStats();
  initAddProductForm();
  renderAdminTable();
  initAdminTable();
  renderDbSyncStatus();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", (e) => { e.preventDefault(); adminLogout(); });

  const exportBtn = document.getElementById("exportDbBtn");
  if (exportBtn) exportBtn.addEventListener("click", exportProductsDatabase);

  const reloadBtn = document.getElementById("reloadDbBtn");
  if (reloadBtn) {
    reloadBtn.addEventListener("click", async () => {
      if (!confirm("Discard unsaved local edits and reload the published database?")) return;
      await discardDraftAndReload();
      renderAdminStats();
      renderAdminTable();
      renderDbSyncStatus();
      const info = getLastSyncInfo();
      if (info) {
        alert(`Reloaded ${info.count} products from:\n${info.url}\n\nIf this still looks like your old data, your edit hasn't been pushed to main yet — replacing the local file isn't enough on the live site.`);
      }
    });
  }
}
