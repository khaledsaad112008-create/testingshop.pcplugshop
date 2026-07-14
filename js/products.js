/* ==========================================================================
   PLUG — Product data + localStorage logic
   ========================================================================== */

const PRODUCTS_KEY = "pc_plug_products_v3";
const PRODUCTS_DIRTY_KEY = "pc_plug_products_dirty";
const PRODUCTS_LAST_SYNC_KEY = "pc_plug_last_sync";

/* Canonical category list — the single source of truth for admin + storefront filters. */
const CATEGORIES = [
  "CPUs", "GPUs", "Motherboards", "RAM", "Storage", "Power Supplies",
  "Cases", "Cooling", "Monitors", "Keyboards", "Mice", "Headsets",
  "Full PCs", "Laptops", "Networking", "Gift Cards",
];

/* The product catalog lives in data/products.json (the "database"), not in this file. */
function dataFilePath(name) {
  return window.location.pathname.includes("/admin/") ? `../data/${name}` : `data/${name}`;
}

function isDraftDirty() {
  return localStorage.getItem(PRODUCTS_DIRTY_KEY) === "true";
}

function markDraftDirty() {
  localStorage.setItem(PRODUCTS_DIRTY_KEY, "true");
}

/* Discards any unsaved admin edits and re-syncs from the published database file. */
async function discardDraftAndReload() {
  localStorage.removeItem(PRODUCTS_DIRTY_KEY);
  localStorage.removeItem(PRODUCTS_KEY);
  await loadProducts();
}

/* Pulls the published database on every load, unless this browser has an
   unsaved admin draft (tracked via PRODUCTS_DIRTY_KEY) that would otherwise
   get silently overwritten before it's exported. */
async function loadProducts() {
  if (isDraftDirty() && localStorage.getItem(PRODUCTS_KEY)) return;
  const path = dataFilePath("products.json");
  try {
    const res = await fetch(path, { cache: "no-store" });
    const data = await res.json();
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(data));
    localStorage.setItem(PRODUCTS_LAST_SYNC_KEY, JSON.stringify({
      count: data.length,
      url: new URL(path, window.location.href).href,
      time: Date.now(),
    }));
  } catch (e) {
    if (!localStorage.getItem(PRODUCTS_KEY)) localStorage.setItem(PRODUCTS_KEY, JSON.stringify([]));
  }
}

/* Info about the last successful fetch from the published database file —
   used by the admin dashboard to show what it actually loaded, so a stale
   reload (e.g. live site not yet re-deployed) is obvious instead of confusing. */
function getLastSyncInfo() {
  try {
    return JSON.parse(localStorage.getItem(PRODUCTS_LAST_SYNC_KEY));
  } catch (e) {
    return null;
  }
}

/* ---------- CRUD ---------- */
function getProducts() {
  try {
    return JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveProducts(products) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  markDraftDirty();
}

function getProductById(id) {
  return getProducts().find((p) => p.id === id) || null;
}

function generateId() {
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function addProduct(data) {
  const products = getProducts();
  const product = {
    id: generateId(),
    name: data.name,
    price: Number(data.price) || 0,
    category: data.category || "Uncategorized",
    stock: Number(data.stock) || 0,
    image: data.image || "https://picsum.photos/seed/plug-default/500/400",
    description: data.description || "",
  };
  products.push(product);
  saveProducts(products);
  return product;
}

function updateProduct(id, updates) {
  const products = getProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  products[idx] = { ...products[idx], ...updates };
  saveProducts(products);
  return products[idx];
}

function deleteProduct(id) {
  const products = getProducts().filter((p) => p.id !== id);
  saveProducts(products);
}

function getCategories() {
  return CATEGORIES;
}

/* ---------- Helpers ---------- */
function formatPrice(num) {
  return Number(num).toFixed(2) + " QAR";
}

function stockStatus(stock) {
  if (stock <= 0) return { label: "Out of stock", cls: "out" };
  if (stock <= 5) return { label: `Only ${stock} left`, cls: "low" };
  return { label: `${stock} in stock`, cls: "" };
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

/* ---------- Rendering: product card ---------- */
function buildInquiryUrl(product) {
  const link = new URL(`product.html?id=${encodeURIComponent(product.id)}`, window.location.href).href;
  const message = `Hi! Is this product available? ${product.name}\n${link}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function stockActionHtml(p) {
  if (p.stock > 0) {
    return `<button class="btn btn-primary btn-block add-to-cart-btn" data-id="${p.id}">Add to Cart</button>`;
  }
  return `<a class="btn btn-outline btn-block" href="${buildInquiryUrl(p)}" target="_blank" rel="noopener">${whatsappIcon()} Inquire on WhatsApp</a>`;
}

function productCardHtml(p, index) {
  const status = stockStatus(p.stock);
  return `
    <div class="product-card" data-id="${p.id}" style="--card-i:${index}">
      <a href="product.html?id=${encodeURIComponent(p.id)}" class="thumb" style="background-image:url('${p.image}')">
        <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" />
      </a>
      <div class="body">
        <span class="category">${escapeHtml(p.category)}</span>
        <h3><a href="product.html?id=${encodeURIComponent(p.id)}">${escapeHtml(p.name)}</a></h3>
        <span class="stock-tag ${status.cls}">${status.label}</span>
        <span class="price">${formatPrice(p.price)}</span>
        <div class="actions">
          ${stockActionHtml(p)}
        </div>
      </div>
    </div>
  `;
}

function renderProductGrid(container, products) {
  if (!products.length) {
    container.innerHTML = `<div class="empty-state">No products found. Try a different search or category.</div>`;
    return;
  }
  container.innerHTML = products.map((p, i) => productCardHtml(p, i)).join("");
}

/* ---------- Homepage ---------- */
function initHomePage() {
  const grid = document.getElementById("productGrid");
  const searchInput = document.getElementById("searchInput");
  const categorySelect = document.getElementById("categorySelect");
  const countLabel = document.getElementById("resultsCount");
  if (!grid) return;

  const categories = getCategories();
  categorySelect.innerHTML =
    `<option value="">All Categories</option>` +
    categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

  const requestedCategory = new URLSearchParams(window.location.search).get("category");
  if (requestedCategory && categories.includes(requestedCategory)) {
    categorySelect.value = requestedCategory;
  }

  function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;
    let products = getProducts();

    if (category) {
      products = products.filter((p) => p.category === category);
    }
    if (query) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          (p.description || "").toLowerCase().includes(query)
      );
    }

    renderProductGrid(grid, products);
    countLabel.textContent = `${products.length} product${products.length === 1 ? "" : "s"}`;
  }

  searchInput.addEventListener("input", applyFilters);
  categorySelect.addEventListener("change", applyFilters);

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-to-cart-btn");
    if (!btn || btn.disabled) return;
    addToCart(btn.dataset.id, 1);
    showToast("Added to cart");
    updateCartBadge();
    pulseAddToCart(btn);
  });

  applyFilters();
}

/* ---------- Header category dropdown (all pages) ---------- */
function initCategoryMenu() {
  const menu = document.getElementById("categoryMenu");
  const list = document.getElementById("categoryMenuList");
  if (!menu || !list) return;

  const base = window.location.pathname.includes("/admin/") ? "../index.html" : "index.html";
  list.innerHTML = getCategories()
    .map((c) => `<a href="${base}?category=${encodeURIComponent(c)}">${escapeHtml(c)}</a>`)
    .join("");

  const toggle = menu.querySelector(".nav-dropdown-toggle");
  toggle.addEventListener("click", () => menu.classList.toggle("open"));
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) menu.classList.remove("open");
  });
}

/* ---------- Product detail page ---------- */
function initProductDetailPage() {
  const wrap = document.getElementById("productDetail");
  if (!wrap) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const product = id ? getProductById(id) : null;

  if (!product) {
    wrap.innerHTML = `<div class="empty-state">Product not found. <a href="index.html" class="btn btn-outline" style="margin-top:12px;">Back to shop</a></div>`;
    return;
  }

  document.title = `${product.name} — PC PLUG`;
  const status = stockStatus(product.stock);

  wrap.innerHTML = `
    <div class="image-wrap" style="background-image:url('${product.image}')">
      <img src="${product.image}" alt="${escapeHtml(product.name)}" />
    </div>
    <div class="info">
      <span class="category">${escapeHtml(product.category)}</span>
      <h1>${escapeHtml(product.name)}</h1>
      <div class="price">${formatPrice(product.price)}</div>
      <p class="description">${escapeHtml(product.description)}</p>
      <span class="stock-tag ${status.cls}">${status.label}</span>
      <div class="qty-row">
        ${
          product.stock > 0
            ? `
          <div class="qty-control">
            <button type="button" id="qtyMinus">−</button>
            <input type="number" id="qtyInput" value="1" min="1" max="${product.stock}" />
            <button type="button" id="qtyPlus">+</button>
          </div>
          <button class="btn btn-primary add-to-cart-btn" id="addToCartBtn">Add to Cart</button>
        `
            : `<a class="btn btn-outline" href="${buildInquiryUrl(product)}" target="_blank" rel="noopener">${whatsappIcon()} Inquire on WhatsApp</a>`
        }
      </div>
    </div>
  `;

  const qtyInput = document.getElementById("qtyInput");
  if (qtyInput) {
    document.getElementById("qtyMinus").addEventListener("click", () => {
      qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
    });
    document.getElementById("qtyPlus").addEventListener("click", () => {
      qtyInput.value = Math.min(Number(qtyInput.max) || 99, Number(qtyInput.value) + 1);
    });
  }

  const addBtn = document.getElementById("addToCartBtn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      addToCart(product.id, Number(qtyInput.value) || 1);
      showToast("Added to cart");
      updateCartBadge();
      pulseAddToCart(addBtn);
    });
  }
}

/* ---------- Shared WhatsApp icon ---------- */
function whatsappIcon() {
  return `<svg class="whatsapp-icon" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false"><path d="M16.04 3C9.37 3 3.98 8.39 3.98 15.06c0 2.2.6 4.34 1.73 6.22L3 29l7.9-2.07a12.02 12.02 0 0 0 5.14 1.15h.01c6.67 0 12.06-5.39 12.06-12.06C28.1 8.39 22.72 3 16.04 3zm0 21.94h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-4.69 1.23 1.25-4.57-.24-.37a9.9 9.9 0 0 1-1.52-5.28c0-5.47 4.45-9.92 9.93-9.92 2.65 0 5.14 1.04 7.02 2.92a9.86 9.86 0 0 1 2.9 7.01c0 5.47-4.45 9.92-9.92 9.92zm5.44-7.43c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35z"/></svg>`;
}

/* ---------- Add-to-cart button feedback ---------- */
let pulseTimers = new WeakMap();
function pulseAddToCart(btn) {
  if (!btn) return;
  clearTimeout(pulseTimers.get(btn));
  if (!btn.dataset.label) btn.dataset.label = btn.textContent;
  btn.classList.add("added");
  btn.textContent = "✓ Added";
  const timer = setTimeout(() => {
    btn.classList.remove("added");
    btn.textContent = btn.dataset.label;
  }, 900);
  pulseTimers.set(btn, timer);
}

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}
