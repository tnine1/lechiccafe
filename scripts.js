// Configuration
const CONFIG = {
  emailAddress: "lechiccafe.info@gmail.com",
  whatsappNumber: "250781043532", // country code + number, no '+'
  cafeName: "Le Chic Cafe",
  locationNote: "Pickup at counter",
  address: "Kicukiro, Kigali, Rwanda"
};

// Helpers
function formSubmitEndpoint(email) {
  return `https://formsubmit.co/ajax/${encodeURIComponent(email)}`;
}

const cart = {};

function formatMoney(n) {
  return Number(n || 0).toLocaleString();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function getCustomerLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        resolve({
          lat,
          lng,
          mapLink: `https://www.google.com/maps?q=${lat},${lng}`
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

function getQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    item: urlParams.get("item"),
    price: urlParams.get("price")
  };
}

// Render cart
function renderCart() {
  const cartItemsEl = document.getElementById("cartItems");
  const cartTotalEl = document.getElementById("cartTotal");
  const cartCountEl = document.getElementById("cartCount");

  if (!cartItemsEl || !cartTotalEl || !cartCountEl) return;

  function wireQtyButtons() {
    cartItemsEl.querySelectorAll(".qty-btn.inc").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        if (cart[id]) cart[id].qty += 1;
        renderCart();
      });
    });
    cartItemsEl.querySelectorAll(".qty-btn.dec").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        if (cart[id]) cart[id].qty -= 1;
        if (cart[id] && cart[id].qty <= 0) delete cart[id];
        renderCart();
      });
    });
  }

  cartItemsEl.innerHTML = "";
  let total = 0;

  if (Object.keys(cart).length === 0) {
    cartItemsEl.innerHTML = `<p class="muted">Your cart is empty.</p>`;
    cartTotalEl.textContent = formatMoney(0);
    cartCountEl.textContent = 0;
    return;
  }

  for (const id in cart) {
    const it = cart[id];
    const subtotal = it.qty * Number(it.price || 0);
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
  cartCountEl.textContent = Object.values(cart).reduce((s, it) => s + (it.qty || 0), 0);
  wireQtyButtons();
}

// Cart modal controls
function openCart() {
  const cartModal = document.getElementById("cartModal");
  if (cartModal) cartModal.classList.remove("hidden");
}
function closeCart() {
  const cartModal = document.getElementById("cartModal");
  if (cartModal) cartModal.classList.add("hidden");
}

// Build order message
function buildOrderMessage(orderObj, customer) {
  const lines = [];
  lines.push(`Order for ${CONFIG.cafeName}`);
  lines.push(`Customer: ${customer.name || "N/A"}`);
  lines.push(`Phone: ${customer.phone || "N/A"}`);
  if (customer.notes) lines.push(`Notes: ${customer.notes}`);
  lines.push(`--`);
  let total = 0;
  for (const id in orderObj) {
    const it = orderObj[id];
    const subtotal = (it.qty || 0) * Number(it.price || 0);
    lines.push(`${it.qty} x ${it.name} — RF ${formatMoney(subtotal)}`);
    total += subtotal;
  }
  lines.push(`--`);
  lines.push(`Total: RF ${formatMoney(total)}`);
  lines.push(`Pickup / Address: ${CONFIG.address}`);
  if (customer.location?.mapLink) {
    lines.push(`Customer Location: ${customer.location.mapLink}`);
  } else {
    lines.push(`Customer Location: Not shared`);
  }
  lines.push(`Sent from website`);
  return lines.join("\n");
}

// Send order via FormSubmit
async function sendOrderToEmail(orderObj, customer) {
  if (!CONFIG.emailAddress) throw new Error("No email configured in CONFIG.emailAddress");
  const endpoint = formSubmitEndpoint(CONFIG.emailAddress);
  const subject = `New order from ${CONFIG.cafeName} (${customer.name || "Unknown"})`;
  const message = buildOrderMessage(orderObj, customer);

  const payload = {
    _subject: subject,
    name: customer.name || "",
    phone: customer.phone || "",
    notes: customer.notes || "",
    message,
    _captcha: "false"
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`FormSubmit failed: ${res.status} ${res.statusText} ${text}`);
  }

  const json = await res.json().catch(() => ({}));
  if (json.success || res.status === 200) return json;
  throw new Error("FormSubmit didn't return success");
}

// Send order to WhatsApp with real location and order details
function sendOrderToWhatsapp(orderObj, customer) {
  if (!CONFIG.whatsappNumber) {
    console.warn("No WhatsApp number configured in CONFIG.whatsappNumber");
    return;
  }

  // Build a WhatsApp-friendly message including map link if available
  const lines = [];
  lines.push(`*New Order for ${CONFIG.cafeName}*`);
  lines.push(`Customer: ${customer.name || "N/A"}`);
  lines.push(`Phone: ${customer.phone || "N/A"}`);
  if (customer.notes) lines.push(`Notes: ${customer.notes}`);
  lines.push(`--`);
  let total = 0;
  for (const id in orderObj) {
    const it = orderObj[id];
    const subtotal = (it.qty || 0) * Number(it.price || 0);
    lines.push(`${it.qty} x ${it.name} — RF ${formatMoney(subtotal)}`);
    total += subtotal;
  }
  lines.push(`--`);
  lines.push(`Total: RF ${formatMoney(total)}`);
  lines.push(`Pickup / Address: ${CONFIG.address}`);
  if (customer.location?.mapLink) {
    lines.push(`Customer Location: ${customer.location.mapLink}`);
  } else {
    lines.push(`Customer Location: Not shared`);
  }
  lines.push(`Please confirm and arrange pickup.`);

  const encodedMessage = encodeURIComponent(lines.join("\n"));
  const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodedMessage}`;
  window.open(whatsappUrl, "_blank");
}

// Main initialization
document.addEventListener("DOMContentLoaded", () => {
  // Elements (IDs expected in HTML)
  const cartBtn = document.getElementById("cartBtn");
  const closeCartBtn = document.getElementById("closeCart");
  const placeOrderBtn = document.getElementById("placeOrderBtn");
  const clearCartBtn = document.getElementById("clearCartBtn");
  const nameInput = document.getElementById("customerName");
  const phoneInput = document.getElementById("customerPhone");
  const notesInput = document.getElementById("customerNotes");
  const emailText = document.getElementById("emailText");
  const yearEl = document.getElementById("year");
  const menuBtn = document.getElementById("menuBtn");
  const sidebar = document.getElementById("sidebar");
  const main = document.querySelector(".main-content");

  if (emailText) emailText.textContent = CONFIG.emailAddress;
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Handle query params (buy now)
  const params = getQueryParams();
  if (params.item && params.price) {
    Object.keys(cart).forEach(k => delete cart[k]);
    cart[params.item] = {
      name: params.item.replace(/-/g, " ").toUpperCase(),
      price: Number(params.price),
      qty: 1
    };
    renderCart();
    openCart();
    const title = document.getElementById("cartTitle");
    if (title) title.textContent = `Order: ${cart[params.item].name}`;
    if (nameInput) nameInput.focus();
  }

  // Attach Buy Now buttons (menu items should have .menu-item with data-id, data-name, data-price)
  document.querySelectorAll(".menu-item").forEach(node => {
    const id = node.dataset.id;
    const name = node.dataset.name;
    const price = Number(node.dataset.price || 0);
    const buyBtn = node.querySelector(".buy-btn");
    if (!buyBtn || !id) return;

    buyBtn.addEventListener("click", () => {
      if (!cart[id]) cart[id] = { name: name || "Item", price, qty: 0 };
      cart[id].qty += 1;
      renderCart();
      openCart();
      if (nameInput) nameInput.focus();
    });
  });

  // Cart open/close
  if (cartBtn) cartBtn.addEventListener("click", () => { renderCart(); openCart(); });
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);

  // Clear cart
  if (clearCartBtn) clearCartBtn.addEventListener("click", () => {
    Object.keys(cart).forEach(k => delete cart[k]);
    renderCart();
  });

  // Place order
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", async () => {
      const name = nameInput?.value?.trim();
      const phone = phoneInput?.value?.trim();
      const notes = notesInput?.value?.trim();

      if (!name) { alert("Please enter your name."); nameInput?.focus(); return; }
      if (!phone) { alert("Please enter your phone number (WhatsApp)."); phoneInput?.focus(); return; }
      if (Object.keys(cart).length === 0) { alert("Your cart is empty."); return; }

      placeOrderBtn.disabled = true;
      placeOrderBtn.textContent = "Sending...";

      try {
        const location = await getCustomerLocation();
        const customer = { name, phone, notes, location };

        // 1. Send email
        await sendOrderToEmail(cart, customer);

        // 2. Open WhatsApp with real location and order details
        sendOrderToWhatsapp(cart, customer);

        // Success: clear cart and confirm
        Object.keys(cart).forEach(k => delete cart[k]);
        renderCart();
        closeCart();
        alert("✅ Success! Your order was sent via email and WhatsApp chat is now opening. Please use WhatsApp to finalize.");
      } catch (err) {
        console.warn("Send failed:", err);
        alert("⚠️ Order sending failed. Please check your internet connection or use the email fallback.");

        // fallback: open mail client with prefilled body
        const location = await getCustomerLocation().catch(() => null);
        const customer = { name, phone, notes, location };
        const subject = `New order for ${CONFIG.cafeName} - ${name || ""}`;
        const body = buildOrderMessage(cart, customer);
        window.location.href = `mailto:${encodeURIComponent(CONFIG.emailAddress)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

  // Sidebar/menu toggle
  if (menuBtn && sidebar && main) {
    menuBtn.onclick = () => {
      sidebar.classList.toggle("active");
      main.classList.toggle("shift");
    };
  }

  // Initial render
  renderCart();
});
