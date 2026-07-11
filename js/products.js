/* ==========================================================================
   PLUG — Product data + localStorage logic
   ========================================================================== */

const PRODUCTS_KEY = "pc_plug_products_v3";

/* Canonical category list — the single source of truth for admin + storefront filters. */
const CATEGORIES = [
  "CPUs", "GPUs", "Motherboards", "RAM", "Storage", "Power Supplies",
  "Cases", "Cooling", "Monitors", "Keyboards", "Mice", "Headsets",
  "Full PCs", "Laptops", "Networking", "Gift Cards",
];

/* [id, name, price, category, stock, imageSeed, description] */
const SEED_PRODUCTS = [
  ["p1", "AMD Ryzen 7 7800X3D", 379.99, "CPUs", 24, "cpu-amd", "8-core/16-thread gaming CPU with 3D V-Cache. Socket AM5."],
  ["p2", "Intel Core i5-14600K", 319.99, "CPUs", 31, "cpu-intel", "14-core unlocked CPU, strong price-to-performance."],
  ["p3", "NVIDIA GeForce RTX 4070 Super", 599.99, "GPUs", 14, "gpu-rtx", "12GB GDDR6X, ray tracing + DLSS 3 for 1440p/4K."],
  ["p4", "AMD Radeon RX 7800 XT", 549.0, "GPUs", 0, "gpu-radeon", "16GB card built for 1440p ultra settings."],
  ["p5", "ASUS ROG B650-A Motherboard", 219.99, "Motherboards", 20, "mobo-asus", "AM5 ATX board, PCIe 5.0, DDR5, WiFi 6E."],
  ["p6", "MSI Z790 Gaming Motherboard", 249.99, "Motherboards", 15, "mobo-msi", "LGA1700 ATX board, PCIe 5.0, DDR5 support."],
  ["p7", "Corsair Vengeance 32GB DDR5 6000MHz", 109.99, "RAM", 50, "ram-corsair", "32GB (2x16GB) DDR5 kit, low latency, RGB."],
  ["p8", "Samsung 990 Pro 2TB NVMe SSD", 149.99, "Storage", 45, "storage-ssd", "PCIe 4.0 NVMe SSD, up to 7450MB/s read."],
  ["p9", "Seagate Barracuda 4TB HDD", 79.99, "Storage", 33, "storage-hdd", "4TB 7200RPM desktop hard drive for bulk storage."],
  ["p10", "Corsair RM850x 850W Gold PSU", 129.99, "Power Supplies", 22, "psu-corsair", "Fully modular 80+ Gold, quiet fan, 10-year warranty."],
  ["p11", "NZXT H510 Flow Mid Tower Case", 89.99, "Cases", 18, "case-nzxt", "Mesh front panel mid tower, tempered glass side."],
  ["p12", "Corsair iCUE H100i 240mm AIO Cooler", 129.99, "Cooling", 16, "cooling-aio", "240mm liquid CPU cooler, RGB pump head."],
  ["p13", '27" 165Hz QHD Gaming Monitor', 279.99, "Monitors", 19, "monitor-165hz", "27-inch QHD IPS, 165Hz, 1ms, FreeSync/G-Sync."],
  ["p14", '34" Ultrawide Curved Monitor', 449.99, "Monitors", 11, "monitor-ultrawide", "34-inch curved ultrawide QHD display."],
  ["p15", "Mechanical RGB Gaming Keyboard", 89.99, "Keyboards", 40, "keyboard-mech", "Hot-swappable switches, per-key RGB, aluminum frame."],
  ["p16", "Wireless Compact Keyboard", 59.99, "Keyboards", 36, "keyboard-wireless", "75% layout, quiet keys, multi-device Bluetooth."],
  ["p17", "Wireless Gaming Mouse", 49.99, "Mice", 42, "mouse-wireless", "26000 DPI sensor, ultra-light, 70hr battery."],
  ["p18", "7.1 Surround Gaming Headset", 69.99, "Headsets", 28, "headset-71", "Virtual 7.1 surround, noise-cancelling mic."],
  ["p19", "PC PLUG Starter Gaming PC", 999.0, "Full PCs", 8, "fullpc-starter", "Ryzen 5 + RTX 4060 prebuilt, 16GB RAM, 1TB NVMe SSD."],
  ["p20", "PC PLUG Elite Gaming PC", 1899.0, "Full PCs", 5, "fullpc-elite", "Ryzen 7 + RTX 4070 Super, 32GB RAM, 2TB NVMe, AIO cooling."],
  ["p21", 'PC PLUG 15" Gaming Laptop', 1299.0, "Laptops", 7, "laptop-gaming", "RTX 4060 laptop, 16GB RAM, 512GB SSD, 165Hz display."],
  ["p22", "WiFi 6E Mesh Router", 179.99, "Networking", 25, "networking-router", "Tri-band mesh router, covers up to 3000 sq ft."],
  ["p23", "Steam Gift Card ($50)", 50.0, "Gift Cards", 100, "giftcard-steam", "Digital $50 Steam Wallet code, instant delivery."],
  ["p24", "PlayStation Store Gift Card ($25)", 25.0, "Gift Cards", 100, "giftcard-psn", "Digital $25 PSN credit, instant code delivery."],
];

function defaultProducts() {
  return SEED_PRODUCTS.map(([id, name, price, category, stock, imageSeed, description]) => ({
    id, name, price, category, stock, description,
    image: `https://picsum.photos/seed/pcplug-${imageSeed}/500/400`,
  }));
}

function seedIfEmpty() {
  const existing = localStorage.getItem(PRODUCTS_KEY);
  if (!existing) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(defaultProducts()));
  }
}

/* ---------- CRUD ---------- */
function getProducts() {
  seedIfEmpty();
  try {
    return JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveProducts(products) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
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
  return "$" + Number(num).toFixed(2);
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
function productCardHtml(p) {
  const status = stockStatus(p.stock);
  return `
    <div class="product-card" data-id="${p.id}">
      <a href="product.html?id=${encodeURIComponent(p.id)}" class="thumb">
        <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" />
      </a>
      <div class="body">
        <span class="category">${escapeHtml(p.category)}</span>
        <h3><a href="product.html?id=${encodeURIComponent(p.id)}">${escapeHtml(p.name)}</a></h3>
        <span class="stock-tag ${status.cls}">${status.label}</span>
        <span class="price">${formatPrice(p.price)}</span>
        <div class="actions">
          <button class="btn btn-primary btn-block add-to-cart-btn" data-id="${p.id}" ${p.stock <= 0 ? "disabled" : ""}>
            ${p.stock <= 0 ? "Out of stock" : "Add to Cart"}
          </button>
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
  container.innerHTML = products.map(productCardHtml).join("");
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
    <div class="image-wrap">
      <img src="${product.image}" alt="${escapeHtml(product.name)}" />
    </div>
    <div class="info">
      <span class="category">${escapeHtml(product.category)}</span>
      <h1>${escapeHtml(product.name)}</h1>
      <div class="price">${formatPrice(product.price)}</div>
      <p class="description">${escapeHtml(product.description)}</p>
      <span class="stock-tag ${status.cls}">${status.label}</span>
      <div class="qty-row">
        <div class="qty-control">
          <button type="button" id="qtyMinus">−</button>
          <input type="number" id="qtyInput" value="1" min="1" max="${Math.max(product.stock, 1)}" />
          <button type="button" id="qtyPlus">+</button>
        </div>
        <button class="btn btn-primary" id="addToCartBtn" ${product.stock <= 0 ? "disabled" : ""}>
          ${product.stock <= 0 ? "Out of stock" : "Add to Cart"}
        </button>
      </div>
    </div>
  `;

  const qtyInput = document.getElementById("qtyInput");
  document.getElementById("qtyMinus").addEventListener("click", () => {
    qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
  });
  document.getElementById("qtyPlus").addEventListener("click", () => {
    qtyInput.value = Math.min(Number(qtyInput.max) || 99, Number(qtyInput.value) + 1);
  });

  const addBtn = document.getElementById("addToCartBtn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      addToCart(product.id, Number(qtyInput.value) || 1);
      showToast("Added to cart");
      updateCartBadge();
    });
  }
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
