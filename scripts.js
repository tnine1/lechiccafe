// Configuration - set your real email and optional WhatsApp fallback
const CONFIG = {
  emailAddress: "lechiccafe.info@gmail.com", // set your cafe email
  whatsappNumber: "+250781043532", // optional fallback or contact display
  cafeName: "Le Chic Cafe",
  locationNote: "Pickup at counter",
  address: "Kicukiro, Kigali, Rwanda"
};

// FormSubmit helper endpoint
function formSubmitEndpoint(email) {
  return `https://formsubmit.co/ajax/${encodeURIComponent(email)}`;
}

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const cartBtn = document.getElementById("cartBtn");
  const cartCountEl = document.getElementById("cartCount");
  const cartModal = document.getElementById("cartModal");
  const closeCartBtn = document.getElementById("closeCart");
  const cartItemsEl = document.getElementById("cartItems");
  const cartTotalEl = document.getElementById("cartTotal");
  const placeOrderBtn = document.getElementById("placeOrderBtn");
  const clearCartBtn = document.getElementById("clearCartBtn");
  const orderForm = document.getElementById("orderForm");
  const nameInput = document.getElementById("customerName");
  const phoneInput = document.getElementById("customerPhone");
  const notesInput = document.getElementById("customerNotes");
  const emailText = document.getElementById("emailText");
  const yearEl = document.getElementById("year");

  if (emailText) emailText.textContent = CONFIG.emailAddress;
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Cart state
  const cart = {};

  // Utility: format money (RWF no decimals)
  function formatMoney(n) {
    // if prices are large integers, format with commas
    return Number(n).toLocaleString();
  }

  function updateCartCount() {
    const count = Object.values(cart).reduce((s, it) => s + it.qty, 0);
    cartCountEl.textContent = count;
  }

  function renderCart() {
    // Empty
    cartItemsEl.innerHTML = "";
    let total = 0;

    if (Object.keys(cart).length === 0) {
      cartItemsEl.innerHTML = `<p class="muted">Your cart is empty.</p>`;
      cartTotalEl.textContent = formatMoney(0);
      updateCartCount();
      return;
    }

    for (const id in cart) {
      const it = cart[id];
      const subtotal = it.qty * Number(it.price);
      total += subtotal;

      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(it.name)}</strong>
          <div class="muted">${it.qty} × RF ${formatMoney(it.price)}</div>
        </div>
        <div>
          RF ${formatMoney(subtotal)}
          <div style="margin-top:6px;text-align:right">
            <button data-id="${id}" class="qty-btn dec">−</button>
            <button data-id="${id}" class="qty-btn inc">+</button>
          </div>
        </div>
      `;
      cartItemsEl.appendChild(row);
    }

    cartTotalEl.textContent = formatMoney(total);
    updateCartCount();
    wireQtyButtons();
  }

  function wireQtyButtons() {
    cartItemsEl.querySelectorAll(".qty-btn.inc").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        cart[id].qty += 1;
        renderCart();
      });
    });
    cartItemsEl.querySelectorAll(".qty-btn.dec").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        cart[id].qty -= 1;
        if (cart[id].qty <= 0) delete cart[id];
        renderCart();
      });
    });
  }

  // Escape helper to avoid HTML injection in item names
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // Attach Buy Now buttons

// =========================
// CONFIGURATION
// =========================
const CONFIG = {
  emailAddress: "lechiccafe.info@gmail.com",
  whatsappNumber: "+250781043532",
  cafeName: "Le Chic Cafe",
  address: "Kicukiro, Kigali, Rwanda"
};

// =========================
// GLOBAL CART STORE
// =========================
const cart = {};

// HTML HANDLES
const cartBtn = document.getElementById("cartBtn");
const cartModal = document.getElementById("cartModal");
const closeCartBtn = document.getElementById("closeCartBtn");
const clearCartBtn = document.getElementById("clearCartBtn");
const placeOrderBtn = document.getElementById("placeOrderBtn");

const nameInput = document.getElementById("customerName");
const phoneInput = document.getElementById("customerPhone");
const notesInput = document.getElementById("customerNotes");

const cartTable = document.getElementById("cartTable");

// =========================
// HELPERS
// =========================
function formatMoney(num) {
  return num.toLocaleString("en-US");
}

function formSubmitEndpoint(email) {
  return `https://formsubmit.co/ajax/${email}`;
}

// =========================
// RENDER CART
// =========================
function renderCart() {
  cartTable.innerHTML = "";

  let total = 0;

  for (const id in cart) {
    const it = cart[id];
    const row = document.createElement("tr");

    const subtotal = it.qty * it.price;
    total += subtotal;

    row.innerHTML = `
      <td>${it.name}</td>
      <td>${it.qty}</td>
      <td>RF ${formatMoney(it.price)}</td>
      <td>RF ${formatMoney(subtotal)}</td>
    `;

    cartTable.appendChild(row);
  }

  if (Object.keys(cart).length === 0) {
    cartTable.innerHTML = `<tr><td colspan="4" style="text-align:center;">Your cart is empty</td></tr>`;
  }
}

// =========================
// CART OPEN / CLOSE
// =========================
function openCart() {
  cartModal.classList.remove("hidden");
}
function closeCart() {
  cartModal.classList.add("hidden");
}

if (cartBtn) cartBtn.addEventListener("click", () => { renderCart(); openCart(); });
if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);

if (clearCartBtn) clearCartBtn.addEventListener("click", () => {
  Object.keys(cart).forEach(k => delete cart[k]);
  renderCart();
});

// =========================
// ADD MENU ITEMS TO CART
// =========================
document.querySelectorAll(".menu-item").forEach(node => {
  const id = node.dataset.id;
  const name = node.dataset.name;
  const price = Number(node.dataset.price);

  const buyBtn = node.querySelector(".buy-btn");
  if (!buyBtn) return;

  buyBtn.addEventListener("click", () => {
    if (!cart[id]) cart[id] = { name, price, qty: 0 };
    cart[id].qty += 1;

    renderCart();
    openCart();
    nameInput && nameInput.focus();
  });
});

// =========================
// BUILD ORDER MESSAGE
// =========================
function buildOrderMessage(orderObj, customer) {
  const lines = [];
  lines.push(`Order for ${CONFIG.cafeName}`);
  lines.push(`Customer: ${customer.name}`);
  lines.push(`Phone: ${customer.phone}`);
  if (customer.notes) lines.push(`Notes: ${customer.notes}`);
  lines.push(`--`);

  let total = 0;

  for (const id in orderObj) {
    const it = orderObj[id];
    const subtotal = it.qty * it.price;
    lines.push(`${it.qty} x ${it.name} — RF ${formatMoney(subtotal)}`);
    total += subtotal;
  }

  lines.push(`--`);
  lines.push(`Total: RF ${formatMoney(total)}`);
  lines.push(`Pickup: ${CONFIG.address}`);
  lines.push(`Sent from website`);

  return lines.join("\n");
}

// =========================
// SEND TO EMAIL (FormSubmit)
// =========================
async function sendOrderToEmail(orderObj, customer) {
  const endpoint = formSubmitEndpoint(CONFIG.emailAddress);
  const subject = `New order from ${CONFIG.cafeName} (${customer.name})`;
  const message = buildOrderMessage(orderObj, customer);

  const formData = {
    _subject: subject,
    name: customer.name,
    phone: customer.phone,
    notes: customer.notes || "",
    message: message,
    _captcha: "false",
    _template: "table"
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(formData).toString()
  });

  if (!res.ok) throw new Error("FormSubmit failed");
  return res;
}

// =========================
// SEND TO WHATSAPP
// =========================
function sendOrderToWhatsApp(orderObj, customer) {
  const message = buildOrderMessage(orderObj, customer);
  const phone = CONFIG.whatsappNumber.replace(/\D/g, "");
  const waURL = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(waURL, "_blank");
}

// =========================
// PLACE ORDER
// =========================
if (placeOrderBtn) {
  placeOrderBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const notes = notesInput.value.trim();

    if (!name) { alert("Please enter your name."); nameInput.focus(); return; }
    if (!phone) { alert("Please enter your phone (WhatsApp)."); phoneInput.focus(); return; }
    if (Object.keys(cart).length === 0) { alert("Cart is empty."); return; }

    const customer = { name, phone, notes };

    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = "Sending...";

    try {
      await sendOrderToEmail(cart, customer);
      sendOrderToWhatsApp(cart, customer);

      Object.keys(cart).forEach(k => delete cart[k]);
      renderCart();
      closeCart();

      alert("Order sent! We will contact you on WhatsApp.");
    } catch (err) {
      console.warn("Email failed, fallback:", err);

      const subject = `New order for ${CONFIG.cafeName} - ${encodeURIComponent(name)}`;
      const body = buildOrderMessage(cart, customer);

      window.location.href =
        `mailto:${encodeURIComponent(CONFIG.emailAddress)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      sendOrderToWhatsApp(cart, customer);
    } finally {
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = "Send Order";
    }
  });
}



  // Close modal on ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCart();
  });

  // Initial render (empty cart)
  renderCart();
});

