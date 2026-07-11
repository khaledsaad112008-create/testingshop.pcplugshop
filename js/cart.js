/* ==========================================================================
   PLUG — Shopping cart logic
   ========================================================================== */

const CART_KEY = "plug_cart";
const WHATSAPP_NUMBER = "97477346879";

/* ---------- Storage ---------- */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/* ---------- Mutations ---------- */
function addToCart(productId, qty) {
  qty = Math.max(1, Number(qty) || 1);
  const cart = getCart();
  const line = cart.find((item) => item.productId === productId);
  if (line) {
    line.qty += qty;
  } else {
    cart.push({ productId, qty });
  }
  saveCart(cart);
}

function updateCartQty(productId, qty) {
  qty = Math.max(1, Number(qty) || 1);
  const cart = getCart();
  const line = cart.find((item) => item.productId === productId);
  if (line) {
    line.qty = qty;
    saveCart(cart);
  }
}

function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.productId !== productId);
  saveCart(cart);
}

/* ---------- Derived data ---------- */
function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function getCartLines() {
  return getCart()
    .map((item) => {
      const product = getProductById(item.productId);
      if (!product) return null;
      return { product, qty: item.qty, lineTotal: product.price * item.qty };
    })
    .filter(Boolean);
}

function getCartTotal() {
  return getCartLines().reduce((sum, line) => sum + line.lineTotal, 0);
}

/* ---------- Navbar badge ---------- */
function updateCartBadge() {
  const badge = document.getElementById("cartCount");
  if (badge) badge.textContent = getCartCount();
}

/* ---------- Cart page rendering ---------- */
function renderCartPage() {
  const itemsWrap = document.getElementById("cartItems");
  const summaryWrap = document.getElementById("cartSummary");
  if (!itemsWrap) return;

  const lines = getCartLines();

  if (!lines.length) {
    itemsWrap.innerHTML = `
      <div class="empty-cart">
        <p>Your cart is empty.</p>
        <a href="index.html" class="btn btn-primary">Continue Shopping</a>
      </div>
    `;
    if (summaryWrap) summaryWrap.style.display = "none";
    return;
  }

  if (summaryWrap) summaryWrap.style.display = "";

  itemsWrap.innerHTML = lines
    .map(
      (line) => `
      <div class="cart-item" data-id="${line.product.id}">
        <a href="product.html?id=${encodeURIComponent(line.product.id)}" class="thumb">
          <img src="${line.product.image}" alt="${escapeHtml(line.product.name)}" />
        </a>
        <div class="details">
          <h3><a href="product.html?id=${encodeURIComponent(line.product.id)}">${escapeHtml(line.product.name)}</a></h3>
          <div class="unit-price">${formatPrice(line.product.price)} each</div>
          <div class="qty-control" style="margin-top:8px;">
            <button type="button" class="qty-dec">−</button>
            <input type="number" class="qty-input" value="${line.qty}" min="1" />
            <button type="button" class="qty-inc">+</button>
          </div>
        </div>
        <div class="line-right">
          <span class="line-total">${formatPrice(line.lineTotal)}</span>
          <button type="button" class="remove-btn">Remove</button>
        </div>
      </div>
    `
    )
    .join("");

  renderCartSummary();
}

function getOrderTotals() {
  const lines = getCartLines();
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const shipping = subtotal > 0 ? (subtotal >= 75 ? 0 : 6.99) : 0;
  const tax = subtotal * 0;
  const total = subtotal + shipping + tax;
  return { lines, subtotal, shipping, tax, total };
}

function renderCartSummary() {
  const summaryWrap = document.getElementById("cartSummary");
  if (!summaryWrap) return;
  const { subtotal, shipping, tax, total } = getOrderTotals();

  summaryWrap.innerHTML = `
    <h2>Order Summary</h2>
    <div class="summary-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? "Free" : formatPrice(shipping)}</span></div>
    <div class="summary-row"><span>Tax (0%)</span><span>${formatPrice(tax)}</span></div>
    <div class="summary-row total"><span>Total</span><span>${formatPrice(total)}</span></div>
    <button class="btn btn-primary btn-block" id="checkoutBtn" style="margin-top:16px;">Checkout via WhatsApp</button>
    <form id="checkoutForm" class="checkout-form" style="display:none;">
      <div class="field">
        <label for="checkoutName">Full Name</label>
        <input type="text" id="checkoutName" required minlength="2" autocomplete="name" />
      </div>
      <div class="field">
        <label for="checkoutPhone">Your WhatsApp / Phone Number</label>
        <input type="tel" id="checkoutPhone" required placeholder="e.g. 97450001234" autocomplete="tel" />
      </div>
      <div class="field-error" id="checkoutError"></div>
      <button type="submit" class="btn btn-primary btn-block">Send Order via WhatsApp</button>
    </form>
    <p class="whatsapp-note">💬 You'll be redirected to WhatsApp with your order pre-filled — just hit send.</p>
  `;

  document.getElementById("checkoutBtn").addEventListener("click", () => {
    document.getElementById("checkoutBtn").style.display = "none";
    const form = document.getElementById("checkoutForm");
    form.style.display = "block";
    document.getElementById("checkoutName").focus();
  });

  document.getElementById("checkoutForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("checkoutName");
    const phoneInput = document.getElementById("checkoutPhone");
    const errorEl = document.getElementById("checkoutError");

    const name = nameInput.value.trim().slice(0, 80);
    const phoneDigits = phoneInput.value.replace(/[^0-9]/g, "");

    if (name.length < 2) {
      errorEl.textContent = "Please enter your full name.";
      nameInput.focus();
      return;
    }
    if (phoneDigits.length < 8) {
      errorEl.textContent = "Please enter a valid phone number (at least 8 digits).";
      phoneInput.focus();
      return;
    }

    errorEl.textContent = "";
    sendOrderToWhatsApp(name, phoneDigits);
  });
}

function buildOrderMessage(name, phone) {
  const { lines, subtotal, shipping, tax, total } = getOrderTotals();

  let msg = `New Order — PC PLUG\n\n`;
  msg += `Customer: ${name}\nPhone: ${phone}\n\nItems:\n`;
  lines.forEach((line, i) => {
    const link = new URL(`product.html?id=${encodeURIComponent(line.product.id)}`, window.location.href).href;
    msg += `${i + 1}. ${line.product.name} (x${line.qty}) — ${formatPrice(line.lineTotal)}\n   ${link}\n`;
  });
  msg += `\nSubtotal: ${formatPrice(subtotal)}\nShipping: ${shipping === 0 ? "Free" : formatPrice(shipping)}\nTax: ${formatPrice(tax)}\nTotal: ${formatPrice(total)}`;
  return msg;
}

function sendOrderToWhatsApp(name, phone) {
  const message = buildOrderMessage(name, phone);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener");
  saveCart([]);
  renderCartPage();
  updateCartBadge();
  showToast("Order sent! Confirm it on WhatsApp to complete checkout.");
}

function initCartPage() {
  const itemsWrap = document.getElementById("cartItems");
  if (!itemsWrap) return;

  itemsWrap.addEventListener("click", (e) => {
    const cartItem = e.target.closest(".cart-item");
    if (!cartItem) return;
    const id = cartItem.dataset.id;

    if (e.target.closest(".remove-btn")) {
      removeFromCart(id);
      renderCartPage();
      updateCartBadge();
      return;
    }
    if (e.target.closest(".qty-inc")) {
      const input = cartItem.querySelector(".qty-input");
      updateCartQty(id, Number(input.value) + 1);
      renderCartPage();
      updateCartBadge();
      return;
    }
    if (e.target.closest(".qty-dec")) {
      const input = cartItem.querySelector(".qty-input");
      const newQty = Number(input.value) - 1;
      if (newQty < 1) {
        removeFromCart(id);
      } else {
        updateCartQty(id, newQty);
      }
      renderCartPage();
      updateCartBadge();
      return;
    }
  });

  itemsWrap.addEventListener("change", (e) => {
    if (!e.target.classList.contains("qty-input")) return;
    const cartItem = e.target.closest(".cart-item");
    const id = cartItem.dataset.id;
    const qty = Number(e.target.value);
    if (qty < 1) {
      removeFromCart(id);
    } else {
      updateCartQty(id, qty);
    }
    renderCartPage();
    updateCartBadge();
  });

  renderCartPage();
}
