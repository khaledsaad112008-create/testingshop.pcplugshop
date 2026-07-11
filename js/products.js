/* ==========================================================================
   PLUG — Product data + localStorage logic
   ========================================================================== */

const PRODUCTS_KEY = "plug_products";

/* ---------- Seed data ---------- */
function defaultProducts() {
  return [
    {
      id: "p1",
      name: "USB-C Fast Charge Plug (65W)",
      price: 24.99,
      category: "Chargers",
      stock: 42,
      image: "https://picsum.photos/seed/plug-usbc/500/400",
      description:
        "Compact 65W GaN wall charger with USB-C PD fast charging. Ideal for laptops, tablets and phones on the go.",
    },
    {
      id: "p2",
      name: "Universal Travel Adapter",
      price: 19.5,
      category: "Adapters",
      stock: 30,
      image: "https://picsum.photos/seed/plug-travel/500/400",
      description:
        "All-in-one travel adapter covering 150+ countries, with dual USB-A ports and a USB-C port built in.",
    },
    {
      id: "p3",
      name: "6-Outlet Surge Protector Power Strip",
      price: 32.0,
      category: "Power Strips",
      stock: 18,
      image: "https://picsum.photos/seed/plug-strip/500/400",
      description:
        "Heavy-duty power strip with 6 outlets and surge protection, 6ft braided cord, wall-mountable.",
    },
    {
      id: "p4",
      name: "Braided USB-C to USB-C Cable (2m)",
      price: 12.99,
      category: "Cables",
      stock: 75,
      image: "https://picsum.photos/seed/plug-cable/500/400",
      description:
        "Durable nylon-braided cable rated for 100W charging and 480Mbps data transfer. 2 meter length.",
    },
    {
      id: "p5",
      name: "Smart Wi-Fi Plug",
      price: 14.75,
      category: "Smart Plugs",
      stock: 55,
      image: "https://picsum.photos/seed/plug-smart/500/400",
      description:
        "App-controlled smart plug with voice assistant support, scheduling, and energy usage tracking.",
    },
    {
      id: "p6",
      name: "3-Prong to 2-Prong Adapter Pack (6x)",
      price: 8.99,
      category: "Adapters",
      stock: 0,
      image: "https://picsum.photos/seed/plug-3prong/500/400",
      description:
        "Grounded to ungrounded outlet adapters, pack of 6, industrial-grade construction.",
    },
    {
      id: "p7",
      name: "Desktop Charging Station (4-Port)",
      price: 45.0,
      category: "Chargers",
      stock: 12,
      image: "https://picsum.photos/seed/plug-station/500/400",
      description:
        "4-port desktop charging hub with individual smart chips for optimal charging speed per device.",
    },
    {
      id: "p8",
      name: "Right-Angle USB-A to USB-C Cable (1m)",
      price: 9.99,
      category: "Cables",
      stock: 60,
      image: "https://picsum.photos/seed/plug-angle/500/400",
      description:
        "Space-saving right-angle connector, reinforced stress points, 1 meter length.",
    },
    {
      id: "p9",
      name: "Extension Cord Reel (10m)",
      price: 27.5,
      category: "Power Strips",
      stock: 9,
      image: "https://picsum.photos/seed/plug-reel/500/400",
      description:
        "Retractable 10 meter extension cord reel with 3 grounded outlets and thermal cut-off protection.",
    },
    {
      id: "p10",
      name: "Smart Plug Mini (2-Pack)",
      price: 22.99,
      category: "Smart Plugs",
      stock: 26,
      image: "https://picsum.photos/seed/plug-mini/500/400",
      description:
        "Compact smart plugs that fit tight outlet spaces without blocking the adjacent socket. Pack of 2.",
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
  if (!grid) return;

  const categories = getCategories();
  categorySelect.innerHTML =
    `<option value="">All Categories</option>` +
    categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

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
