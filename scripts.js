/* =====================================================
   Le Chic Cafe – Unified Cart + WhatsApp + Email System
   FREE — No API Keys Needed
   ===================================================== */

const CONFIG = {
  emailAddress: "lechiccafe.info@gmail.com",
  whatsappNumber: "250781043532",
  cafeName: "Le Chic Cafe",
  address: "Kicukiro, Kigali, Rwanda",
};

const CART_KEY = "leChicCart_v1";

document.addEventListener("DOMContentLoaded", () => {

  const cartCountEl = document.getElementById("cartCount");
  const cartItemsEl = document.getElementById("cartItems");
  const cartTotalEl = document.getElementById("cartTotal");
  const cartModal = document.getElementById("cartModal");
  const cartBtn = document.getElementById("cartBtn");
  const closeCartBtn = document.getElementById("closeCart");
  const clearCartBtn = document.getElementById("clearCartBtn");
  const placeOrderBtn = document.getElementById("placeOrderBtn");
  const nameInput = document.getElementById("customerName");
  const phoneInput = document.getElementById("customerPhone");
  const notesInput = document.getElementById("customerNotes");

  // ---------- CART CORE ----------
  let cart = loadCart();

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function loadCart() {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  function parsePriceRaw(v) {
    if (!v) return 0;
    const cleaned = String(v).replace(/[^\d]/g, "");
    return parseInt(cleaned) || 0;
  }

  function formatMoney(n) {
    return Number(n).toLocaleString();
  }

  function renderCart() {
    cartItemsEl.innerHTML = "";
    let total = 0;
    const ids = Object.keys(cart);

    if (ids.length === 0) {
      cartItemsEl.innerHTML = `<p class="muted">Your cart is empty.</p>`;
      cartTotalEl.textContent = "0";
      updateCartCount();
      return;
    }

    ids.forEach(id => {
      const it = cart[id];
      const subtotal = it.qty * it.price;
      total += subtotal;

      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <div>
          <strong>${it.name}</strong>
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
    });

    cartTotalEl.textContent = formatMoney(total);
    updateCartCount();
    wireQtyButtons();
    saveCart();
  }

  function updateCartCount() {
    const count = Object.values(cart).reduce((n, it) => n + it.qty, 0);
    cartCountEl.textContent = count;
  }

  function wireQtyButtons() {
    cartItemsEl.querySelectorAll(".qty-btn.inc").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        cart[id].qty++;
        renderCart();
      };
    });
    cartItemsEl.querySelectorAll(".qty-btn.dec").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        cart[id].qty--;
        if (cart[id].qty <= 0) delete cart[id];
        renderCart();
      };
    });
  }

  // ---------- ADD TO CART ----------
  function addToCart({ id, name, price }) {
    if (!cart[id]) cart[id] = { name, price, qty: 0 };
    cart[id].qty++;
    renderCart();
  }

  document.querySelectorAll(".menu-item").forEach(node => {
    const id = node.dataset.id;
    const name = node.dataset.name;
    const price = parsePriceRaw(node.dataset.price);
    const btn = node.querySelector(".buy-btn");

    btn.onclick = () => {
      addToCart({ id, name, price });
      openCart();
    };
  });

  // ---------- CART MODAL ----------
  function openCart() {
    cartModal.classList.remove("hidden");
  }

  function closeCart() {
    cartModal.classList.add("hidden");
  }

  cartBtn.onclick = openCart;
  closeCartBtn.onclick = closeCart;

  clearCartBtn.onclick = () => {
    cart = {};
    saveCart();
    renderCart();
  };

  // ---------- ORDER SENDING ----------
  placeOrderBtn.onclick = async () => {
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const notes = notesInput.value.trim();

    if (!name) return alert("Enter your name");
    if (!phone) return alert("Enter your WhatsApp number");
    if (Object.keys(cart).length === 0) return alert("Cart is empty!");

    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = "Sending...";

    try {

      // 1) Send Email
      await sendOrderToEmail(cart, { name, phone, notes });

      // 2) Send WhatsApp
      sendOrderToWhatsApp(cart, { name, phone, notes });

      // 3) Clear cart
      cart = {};
      saveCart();
      renderCart();
      closeCart();

      alert("Order sent successfully!");

    } catch (err) {
      console.error(err);
      alert("Email failed — sending WhatsApp only");
      sendOrderToWhatsApp(cart, { name, phone, notes });
    }

    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Send Order";
  };

  // ---------- WhatsApp ----------
  function sendOrderToWhatsApp(order, customer) {
    let msg = `*Order — ${CONFIG.cafeName}*\n`;
    msg += `Customer: ${customer.name}\n`;
    msg += `Phone: ${customer.phone}\n`;
    if (customer.notes) msg += `Notes: ${customer.notes}\n`;
    msg += `----------------------\n`;

    let total = 0;
    for (let id in order) {
      let it = order[id];
      let sub = it.qty * it.price;
      total += sub;
      msg += `${it.qty} × ${it.name} — RF ${formatMoney(sub)}\n`;
    }

    msg += `----------------------\n`;
    msg += `Total: RF ${formatMoney(total)}\n`;
    msg += `Pickup: ${CONFIG.address}`;

    let url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  // ---------- Email (FormSubmit — FREE) ----------
  async function sendOrderToEmail(order, customer) {
    const endpoint = `https://formsubmit.co/ajax/${CONFIG.emailAddress}`;
    const payload = {
      _subject: `New Order — ${customer.name}`,
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes || "",
      message: buildOrderMessage(order, customer),
      _captcha: "false"
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Email failed");
  }

  function buildOrderMessage(order, customer) {
    let msg = `Order from ${customer.name}\n`;
    msg += `Phone: ${customer.phone}\n`;
    if (customer.notes) msg += `Notes: ${customer.notes}\n`;
    msg += `-----------------\n`;
    let total = 0;
    for (let id in order) {
      let it = order[id];
      let sub = it.qty * it.price;
      msg += `${it.qty} × ${it.name} — RF ${sub}\n`;
      total += sub;
    }
    msg += `-----------------\nTotal: RF ${total}`;
    return msg;
  }

  renderCart();
});
