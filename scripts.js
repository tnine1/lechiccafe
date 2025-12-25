// Improved cart wiring: Buy Now buttons add items to the cart and update UI (persistent)
// Replace your existing script.js with this file.

const CONFIG = {
  emailAddress: "lechiccafe.info@gmail.com", // your email (used elsewhere)
  whatsappNumber: "+250781043532",
  cafeName: "Le Chic Cafe",
  address: "Kicukiro, Kigali, Rwanda",
};

const CART_KEY = "leChicCart_v1";

document.addEventListener("DOMContentLoaded", () => {
  // DOM refs
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

  // Load or init cart
  let cart = loadCart();

  // Utilities
  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn("Could not save cart to localStorage", e);
    }
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch (e) {
      return {};
    }
  }

  // Parse a dataset price into integer RWF amount.
  // Accepts numbers or strings like "2500", "RF 2,500", "2,500", "2500.00"
  function parsePriceRaw(v) {
    if (v == null) return 0;
    if (typeof v === "number") return Math.round(v);
    // strip non-digit characters except dot and comma
    const cleaned = String(v).replace(/[^\d.,\-]/g, "").replace(/,/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }

  function formatMoney(n) {
    // RWF typically no decimals; format with thousands separators
    try {
      return Number(n).toLocaleString();
    } catch (e) {
      return String(n);
    }
  }

  // Render cart UI
  function renderCart() {
    if (!cartItemsEl) return;
    cartItemsEl.innerHTML = "";
    let total = 0;

    const ids = Object.keys(cart);
    if (ids.length === 0) {
      cartItemsEl.innerHTML = `<p class="muted">Your cart is empty.</p>`;
      if (cartTotalEl) cartTotalEl.textContent = formatMoney(0);
      updateCartCount();
      return;
    }

    ids.forEach(id => {
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
    });

    if (cartTotalEl) cartTotalEl.textContent = formatMoney(total);
    updateCartCount();
    wireQtyButtons();
    saveCart();
  }

  function updateCartCount() {
    const count = Object.values(cart).reduce((s, it) => s + it.qty, 0);
    if (cartCountEl) cartCountEl.textContent = count;
  }

  function wireQtyButtons() {
    if (!cartItemsEl) return;

    cartItemsEl.querySelectorAll(".qty-btn.inc").forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.dataset.id;
        if (!cart[id]) return;
        cart[id].qty += 1;
        renderCart();
        showToast(`${cart[id].name} quantity: ${cart[id].qty}`);
      };
    });

    cartItemsEl.querySelectorAll(".qty-btn.dec").forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.dataset.id;
        if (!cart[id]) return;
        cart[id].qty -= 1;
        if (cart[id].qty <= 0) delete cart[id];
        renderCart();
      };
    });
  }

  // Escape helper
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
    }[m]));
  }

  // Toast helper
  function showToast(text, ms = 1600) {
    const t = document.createElement("div");
    t.className = "le-toast";
    t.textContent = text;
    Object.assign(t.style, {
      position: "fixed",
      right: "16px",
      bottom: "18px",
      background: "#222",
      color: "#fff",
      padding: "8px 12px",
      borderRadius: "8px",
      boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
      zIndex: 99999,
      fontSize: "14px",
    });
    document.body.appendChild(t);
    setTimeout(() => {
      t.style.transition = "opacity 220ms";
      t.style.opacity = "0";
    }, ms - 220);
    setTimeout(() => t.remove(), ms);
  }

  // Add item to cart (public)
  function addToCart({ id, name, price, qty = 1 }) {
    if (!id) return;
    if (!cart[id]) cart[id] = { name, price: Number(price), qty: 0 };
    cart[id].qty += qty;
    saveCart();
    renderCart();
    showToast(`Added ${name} ×${qty}`);
  }

  // Attach Buy Now buttons
  document.querySelectorAll("menu-item, .menu-item").forEach(node => {
    const id = node.dataset.id;
    const name = node.dataset.name || node.querySelector("h4")?.textContent || id;
    const rawPrice = node.dataset.price;
    const price = parsePriceRaw(rawPrice);
    const buyBtn = node.querySelector(".buy-btn");
    if (!buyBtn) return;

    buyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      addToCart({ id, name, price, qty: 1 });
      // open cart modal so user can confirm
      openCart();
      // focus name input if present so user can quickly type details
      if (nameInput) nameInput.focus();
    });
  });

  // Cart modal controls
  if (cartBtn) cartBtn.addEventListener("click", () => {
    renderCart();
    openCart();
  });
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);
  if (clearCartBtn) clearCartBtn.addEventListener("click", () => {
    Object.keys(cart).forEach(k => delete cart[k]);
    renderCart();
  });

  function openCart() {
    if (!cartModal) return;
    cartModal.classList.remove("hidden");
  }

  function closeCart() {
    if (!cartModal) return;
    cartModal.classList.add("hidden");
  }

  // Place order: send to email, then WhatsApp, include location if granted
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", async () => {
      const name = nameInput?.value?.trim();
      const phone = phoneInput?.value?.trim();
      const notes = notesInput?.value?.trim();

      if (!name) { alert("Please enter your name."); nameInput?.focus(); return; }
      if (!phone) { alert("Please enter your phone (WhatsApp)."); phoneInput?.focus(); return; }
      if (Object.keys(cart).length === 0) { alert("Your cart is empty."); return; }

      placeOrderBtn.disabled = true;
      placeOrderBtn.textContent = "Sending...";

      // get location (optional)
      let locationText = "";
      let mapsLink = "";
      try {
        if (navigator.geolocation) {
          await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const { latitude, longitude } = pos.coords;
                locationText = `Lat: ${latitude}, Lng: ${longitude}`;
                mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
                resolve();
              },
              () => resolve(), // ignore errors (denied or unavailable)
              { enableHighAccuracy: true, timeout: 8000 }
            );
          });
        }
      } catch {
        // ignore
      }

      try {
        // send email first
        await sendOrderToEmail(cart, { name, phone, notes, location: locationText, mapsLink });

        // build WhatsApp message
        const body = buildOrderMessage(cart, { name, phone, notes, location: locationText, mapsLink });
        const waNumber = CONFIG.whatsappNumber.replace(/\D/g, ""); // digits only for wa.me
        const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(body)}`;

        // open WhatsApp (new tab); if blocked, try same-tab as fallback
        const w = window.open(whatsappUrl, "_blank");
        if (!w) window.location.href = whatsappUrl;

        // success: clear and close
        Object.keys(cart).forEach(k => delete cart[k]);
        saveCart();
        renderCart();
        closeCart();
        alert("Order sent — we'll contact you on WhatsApp to confirm pickup.");
      } catch (err) {
        console.warn("Send failed, fallback to mailto", err);
        const body = buildOrderMessage(cart, { name, phone, notes, location: locationText, mapsLink });
        window.location.href = `mailto:${encodeURIComponent(CONFIG.emailAddress)}?subject=${encodeURIComponent("Order from website")}&body=${encodeURIComponent(body)}`;
      } finally {
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = "Send Order";
      }
    });
  }

  // Build order message (used by email, WhatsApp, and fallback)
  function buildOrderMessage(orderObj, customer) {
    const lines = [];
    lines.push(`Order for ${CONFIG.cafeName}`);
    lines.push(`Customer: ${customer.name}`);
    lines.push(`Phone: ${customer.phone}`);
    if (customer.notes) lines.push(`Notes: ${customer.notes}`);
    if (customer.location) lines.push(`Location: ${customer.location}`);
    if (customer.mapsLink) lines.push(`Map: ${customer.mapsLink}`);
    lines.push(`--`);
    let total = 0;
    for (const id in orderObj) {
      const it = orderObj[id];
      const subtotal = it.qty * Number(it.price);
      lines.push(`${it.qty} x ${it.name} — RF ${formatMoney(subtotal)}`);
      total += subtotal;
    }
    lines.push(`--`);
    lines.push(`Total: RF ${formatMoney(total)}`);
    lines.push(`Address/Pickup: ${CONFIG.address}`);
    lines.push(`Sent from website`);
    return lines.join("\n");
  }

  // Send order to FormSubmit (same helper as earlier)
  async function sendOrderToEmail(orderObj, customer) {
    if (!CONFIG.emailAddress) throw new Error("No email configured");
    const endpoint = `https://formsubmit.co/ajax/${encodeURIComponent(CONFIG.emailAddress)}`;
    const payload = {
      _subject: `New order from ${CONFIG.cafeName} (${customer.name})`,
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes || "",
      location: customer.location || "",
      maps_link: customer.mapsLink || "",
      message: buildOrderMessage(orderObj, customer),
      _captcha: "false"
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`FormSubmit error ${res.status} ${txt}`);
    }
    const json = await res.json().catch(() => ({}));
    if (json.success || res.status === 200) return json;
    throw new Error("FormSubmit did not return success");
  }

  // Close modal on ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCart();
  });

  // Initial UI render
  renderCart();
});

 const menuBtn = document.getElementById("menuBtn");
    const sidebar = document.getElementById("sidebar");
    const main = document.querySelector(".main-content");

    if (menuBtn && sidebar && main) {
        menuBtn.onclick = () => {
            sidebar.classList.toggle("active");
            main.classList.toggle("shift");
        };
    }

