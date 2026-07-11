/* ==========================================================================
   PLUG — Product data + localStorage logic
   ========================================================================== */

const PRODUCTS_KEY = "pc_plug_products_v2";

/* ---------- Category icons (used across the site) ---------- */
const CATEGORY_ICONS = {
  CPUs: "🧠",
  GPUs: "🎮",
  "Full PCs": "🖥️",
  Monitors: "🖥️",
  Keyboards: "⌨️",
  "Gift Cards": "🎁",
};

/* ---------- Seed data ---------- */
function defaultProducts() {
  return [
    {
      id: "p1",
      name: "AMD Ryzen 7 7800X3D",
      price: 379.99,
      category: "CPUs",
      stock: 24,
      image: "https://picsum.photos/seed/pcplug-cpu-amd/500/400",
      description:
        "8-core / 16-thread gaming CPU with 3D V-Cache for class-leading frame rates. Socket AM5.",
    },
    {
      id: "p2",
      name: "Intel Core i5-14600K",
      price: 319.99,
      category: "CPUs",
      stock: 31,
      image: "https://picsum.photos/seed/pcplug-cpu-intel/500/400",
      description:
        "14-core unlocked desktop processor, great price-to-performance for gaming and multitasking.",
    },
    {
      id: "p3",
      name: "NVIDIA GeForce RTX 4070 Super",
      price: 599.99,
      category: "GPUs",
      stock: 14,
      image: "https://picsum.photos/seed/pcplug-gpu-rtx/500/400",
      description:
        "12GB GDDR6X graphics card with ray tracing and DLSS 3 — smooth 1440p and entry 4K gaming.",
    },
    {
      id: "p4",
      name: "AMD Radeon RX 7800 XT",
      price: 549.0,
      category: "GPUs",
      stock: 0,
      image: "https://picsum.photos/seed/pcplug-gpu-radeon/500/400",
      description:
        "16GB high-performance card built for 1440p ultra settings and high refresh rate gaming.",
    },
    {
      id: "p5",
      name: "PC PLUG Starter Gaming PC",
      price: 999.0,
      category: "Full PCs",
      stock: 8,
      image: "https://picsum.photos/seed/pcplug-fullpc-starter/500/400",
      description:
        "Ryzen 5 + RTX 4060 prebuilt, 16GB RAM, 1TB NVMe SSD. Ready to play out of the box.",
    },
    {
      id: "p6",
      name: "PC PLUG Elite Gaming PC",
      price: 1899.0,
      category: "Full PCs",
      stock: 5,
      image: "https://picsum.photos/seed/pcplug-fullpc-elite/500/400",
      description:
        "Ryzen 7 + RTX 4070 Super prebuilt, 32GB RAM, 2TB NVMe SSD, liquid cooling, RGB build.",
    },
    {
      id: "p7",
      name: '27" 165Hz QHD Gaming Monitor',
      price: 279.99,
      category: "Monitors",
      stock: 19,
      image: "https://picsum.photos/seed/pcplug-monitor-165hz/500/400",
      description:
        "27-inch QHD IPS panel, 165Hz refresh rate, 1ms response time, FreeSync / G-Sync compatible.",
    },
    {
      id: "p8",
      name: '34" Ultrawide Curved Monitor',
      price: 449.99,
      category: "Monitors",
      stock: 11,
      image: "https://picsum.photos/seed/pcplug-monitor-ultrawide/500/400",
      description:
        "34-inch curved ultrawide QHD display for immersive gaming and productivity multitasking.",
    },
    {
      id: "p9",
      name: "Mechanical RGB Gaming Keyboard",
      price: 89.99,
      category: "Keyboards",
      stock: 40,
      image: "https://picsum.photos/seed/pcplug-keyboard-mech/500/400",
      description:
        "Hot-swappable mechanical switches, per-key RGB lighting, aluminum frame, USB-C detachable cable.",
    },
    {
      id: "p10",
      name: "Wireless Compact Keyboard",
      price: 59.99,
      category: "Keyboards",
      stock: 36,
      image: "https://picsum.photos/seed/pcplug-keyboard-wireless/500/400",
      description:
        "75% compact layout, quiet low-profile keys, multi-device Bluetooth pairing, long battery life.",
    },
    {
      id: "p11",
      name: "Steam Gift Card ($50)",
      price: 50.0,
      category: "Gift Cards",
      stock: 100,
      image: "https://picsum.photos/seed/pcplug-giftcard-steam/500/400",
      description:
        "Digital $50 Steam Wallet gift card — instant code delivery for games, DLC and in-game items.",
    },
    {
      id: "p12",
      name: "PlayStation Store Gift Card ($25)",
      price: 25.0,
      category: "Gift Cards",
      stock: 100,
      image: "https://picsum.photos/seed/pcplug-giftcard-psn/500/400",
      description:
        "Digital $25 PlayStation Store credit — instant code delivery for games, add-ons and subscriptions.",
    },
  ];
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
  const products = getProducts();
  return [...new Set(products.map((p) => p.category))].sort();
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
  const categoryStripGrid = document.getElementById("categoryStripGrid");
  if (!grid) return;

  const categories = getCategories();
  categorySelect.innerHTML =
    `<option value="">All Categories</option>` +
    categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

  if (categoryStripGrid) {
    categoryStripGrid.innerHTML = categories
      .map(
        (c) => `
        <button type="button" class="category-chip" data-category="${escapeHtml(c)}">
          <span class="icon">${CATEGORY_ICONS[c] || "🔌"}</span>
          <span>${escapeHtml(c)}</span>
        </button>
      `
      )
      .join("");

    categoryStripGrid.addEventListener("click", (e) => {
      const chip = e.target.closest(".category-chip");
      if (!chip) return;
      const category = chip.dataset.category;
      categorySelect.value = categorySelect.value === category ? "" : category;
      categorySelect.dispatchEvent(new Event("change"));
      grid.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function syncCategoryChips() {
    if (!categoryStripGrid) return;
    categoryStripGrid.querySelectorAll(".category-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.category === categorySelect.value);
    });
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
    syncCategoryChips();
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
