function getQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    item: urlParams.get("item"),
    price: urlParams.get("price"),
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const params = getQueryParams();

  if (params.item && params.price) {
    // Clear cart
    Object.keys(cart).forEach(k => delete cart[k]);

    // Add selected item
    cart[params.item] = {
      name: params.item.replace(/-/g, " ").toUpperCase(),
      price: Number(params.price),
      qty: 1
    };

    renderCart();
    openCart();

    // Change modal title
    const title = document.getElementById("cartTitle");
    if (title) title.textContent = `Order: ${cart[params.item].name}`;

    if (nameInput) nameInput.focus();
  }
});


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
  document.querySelectorAll(".menu-item").forEach(node => {
    const id = node.dataset.id;
    const name = node.dataset.name;
    const price = Number(node.dataset.price); // must be numeric

    const buyBtn = node.querySelector(".buy-btn");
    if (!buyBtn) return;

    buyBtn.addEventListener("click", () => {
      // Add item to cart
      if (!cart[id]) cart[id] = { name, price, qty: 0 };
      cart[id].qty += 1;

      // Open cart modal and focus on name input to collect customer info
      renderCart();
      openCart();
      nameInput && nameInput.focus();
    });
  });

  // Cart open/close
  if (cartBtn) cartBtn.addEventListener("click", () => {
    renderCart();
    openCart();
  });
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);

  function openCart() {
    cartModal.classList.remove("hidden");
  }
  function closeCart() {
    cartModal.classList.add("hidden");
  }

  // Clear cart
  if (clearCartBtn) clearCartBtn.addEventListener("click", () => {
    Object.keys(cart).forEach(k => delete cart[k]);
    renderCart();
  });

  // Build order message text
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
      const subtotal = it.qty * Number(it.price);
      lines.push(`${it.qty} x ${it.name} — RF ${formatMoney(subtotal)}`);
      total += subtotal;
    }
    lines.push(`--`);
    lines.push(`Total: RF ${formatMoney(total)}`);
    lines.push(`Pickup / Address: ${CONFIG.address}`);
    lines.push(`Sent from website`);
    return lines.join("\n");
  }

  // Send order to email using FormSubmit.co AJAX
  async function sendOrderToEmail(orderObj, customer) {
    if (!CONFIG.emailAddress) throw new Error("No email configured in CONFIG.emailAddress");
    const endpoint = formSubmitEndpoint(CONFIG.emailAddress);
    const subject = `New order from ${CONFIG.cafeName} (${customer.name})`;
    const message = buildOrderMessage(orderObj, customer);

    const payload = {
      _subject: subject,
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes || "",
      message: message,
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

  // Place order button action
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", async () => {
      // simple validation
      const name = nameInput.value && nameInput.value.trim();
      const phone = phoneInput.value && phoneInput.value.trim();
      const notes = notesInput.value && notesInput.value.trim();

      if (!name) { alert("Please enter your name."); nameInput.focus(); return; }
      if (!phone) { alert("Please enter your phone number (WhatsApp)."); phoneInput.focus(); return; }
      if (Object.keys(cart).length === 0) { alert("Your cart is empty."); return; }

      // prepare customer object
      const customer = { name, phone, notes };

      // disable button to prevent duplicates
      placeOrderBtn.disabled = true;
      placeOrderBtn.textContent = "Sending...";

      try {
        await sendOrderToEmail(cart, customer);
        // success: clear cart and show confirmation
        Object.keys(cart).forEach(k => delete cart[k]);
        renderCart();
        closeCart();
        alert("Thank you — your order was sent. We'll contact you on WhatsApp to confirm pickup.");
      } catch (err) {
        console.warn("Send failed:", err);
        // fallback: open mail client
        const subject = `New order for ${CONFIG.cafeName} - ${encodeURIComponent(name)}`;
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

  // Initial render (empty cart)
  renderCart();
});


  const menuBtn = document.getElementById("menuBtn");
  const sidebar = document.getElementById("sidebar");
  const main = document.querySelector(".main-content");

  menuBtn.onclick = () => {
    sidebar.classList.toggle("active");
    main.classList.toggle("shift");
  };


