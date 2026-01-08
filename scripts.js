// Improved cart wiring: Buy Now buttons add items to the cart and update UI (persistent)
// Replace your existing script.js with this file.

const CONFIG = {
  emailAddress: "lechiccafe.info@gmail.com", // your email (used elsewhere)
  whatsappNumber: "+250790812587",
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

  const items = Array.from(document.querySelectorAll(".menu-item"));
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const searchInput = document.getElementById("menuSearch");

  const ITEMS_PER_LOAD = 3;
  const INITIAL_ITEMS = 9;

  let currentVisible = INITIAL_ITEMS;
  let isSearching = false;

  function showItems() {
    items.forEach((item, index) => {
      item.style.display = index < currentVisible ? "block" : "none";
    });

    loadMoreBtn.style.display =
      currentVisible >= items.length ? "none" : "inline-block";
  }

  // INITIAL LOAD
  showItems();

  // LOAD MORE
  loadMoreBtn.addEventListener("click", () => {
    currentVisible += ITEMS_PER_LOAD;
    showItems();
  });

  // SEARCH
  searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase().trim();
    isSearching = value.length > 0;

    if (isSearching) {
      loadMoreBtn.style.display = "none";

      items.forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(value) ? "block" : "none";
      });
    } else {
      currentVisible = INITIAL_ITEMS;
      showItems();
    }
  });


const chatToggle = document.getElementById("chatToggle");
const chatbot = document.getElementById("chatbot");
const closeChat = document.getElementById("closeChat");

chatToggle.addEventListener("click", () => {
  chatbot.classList.remove("hidden");
  chatToggle.style.display = "none";
});

closeChat.addEventListener("click", () => {
  chatbot.classList.add("hidden");
  chatToggle.style.display = "block";
});
// ================== CAFE DATA ==================
const cafe = {
  name: "Le Chic Café",
  location: "Kigali, Kicukiro – Second building after Simba Traffic Light",
  hours: "Open 24/7 (Mon – Sun)",

menu: [
    // COFFEE
    { name: "Single Espresso", price: 1500, category: "coffee" },
    { name: "Double Espresso", price: 2000, category: "coffee" },
    { name: "Americano", price: 2000, category: "coffee" },
    { name: "Black Coffee", price: 2000, category: "coffee" },
    { name: "Café Latte", price: 2500, category: "coffee" },
    { name: "Cappuccino", price: 2500, category: "coffee" },
    { name: "Cappuccino Big", price: 3000, category: "coffee" },
    { name: "Macchiato", price: 2000, category: "coffee" },
    { name: "Café Mocha", price: 3000, category: "coffee" },
    { name: "African Coffee", price: 3000, category: "coffee" },
    { name: "Hot Chocolate", price: 2500, category: "coffee" },

    // ICED COFFEE
    { name: "Iced Latte", price: 3000, category: "iced coffee" },
    { name: "Iced Cappuccino", price: 3000, category: "iced coffee" },
    { name: "Iced Mocha", price: 3500, category: "iced coffee" },
    { name: "Iced Americano", price: 2500, category: "iced coffee" },

    // TEA
    { name: "Black Tea", price: 2000, category: "tea" },
    { name: "Green Tea", price: 2000, category: "tea" },
    { name: "African Tea", price: 2500, category: "tea" },
    { name: "Ginger Tea", price: 2500, category: "tea" },
    { name: "Dawa Tea", price: 3500, category: "tea" },

    // JUICE
    { name: "Passion Juice", price: 3500, category: "juice" },
    { name: "Mango Juice", price: 5000, category: "juice" },
    { name: "Orange Juice", price: 4000, category: "juice" },
    { name: "Pineapple Juice", price: 3500, category: "juice" },
    { name: "Mojito Juice", price: 6000, category: "juice" },

    // SMOOTHIES & SHAKES
    { name: "Mango Smooth", price: 5000, category: "smoothie" },
    { name: "Banana Smooth", price: 5000, category: "smoothie" },
    { name: "Vanilla Shake", price: 4500, category: "shake" },
    { name: "Chocolate Shake", price: 4500, category: "shake" },

    // BREAKFAST
    { name: "Scrambled Eggs with Toast", price: 5000, category: "breakfast" },
    { name: "Spanish Omelette", price: 5000, category: "breakfast" },
    { name: "Capati Rolex", price: 4000, category: "breakfast" },

    // CHICKEN
    { name: "Chicken Leg", price: 8000, category: "chicken" },
    { name: "Chicken Wings", price: 7000, category: "chicken" },
    { name: "Chicken Curry", price: 8000, category: "chicken" },

    // BEEF
    { name: "Beef Stew", price: 7000, category: "beef" },
    { name: "Beef Brochette", price: 6500, category: "beef" },
    { name: "Beef Steak", price: 8000, category: "beef" },

    // FISH
    { name: "Fish Fillet", price: 8000, category: "fish" },
    { name: "Fish Fingers", price: 7500, category: "fish" },

    // BURGERS
    { name: "Plain Beef Burger", price: 4000, category: "burger" },
    { name: "Chicken Burger", price: 6500, category: "burger" },
    { name: "King Beef Burger", price: 8000, category: "burger" },

    // PIZZA
    { name: "Margarita Pizza", price: 6000, category: "pizza" },
    { name: "Vegetarian Pizza", price: 6500, category: "pizza" },
    { name: "Chicken Pizza", price: 8000, category: "pizza" },
    { name: "Kigali Style Pizza", price: 8500, category: "pizza" }
  ]
};

// ================== CHAT ELEMENTS ==================
const chatBody = document.getElementById("chatBody");
const chatInput = document.getElementById("chatInput");

// ================== GREETING ==================
window.addEventListener("load", () => {
  addBotMessage(
    "Muraho 👋 Welcome to <b>Le Chic Café</b> ☕<br>" +
    "Ndi <b>Lea</b> 🤍, nshobora kugufasha:<br>" +
    "📋 Menu & Prices<br>" +
    "📍 Location<br>" +
    "⭐ Recommendations<br><br>" +
    "Just ask me 😊"
  );
});

// ================== BOT LOGIC ==================
function getBotReply(msg) {
  msg = msg.toLowerCase();

  if (msg.includes("location") || msg.includes("where"))
    return `📍 ${cafe.location}`;

  if (msg.includes("open") || msg.includes("hours"))
    return `⏰ ${cafe.hours}`;

  if (msg.includes("recommend") || msg.includes("suggest"))
    return "⭐ Recommendation: Cappuccino (2,500 RWF) or Chicken Pizza (8,000 RWF).";

  if (msg.includes("cheap") || msg.includes("budget"))
    return "💡 Budget choice: Single Espresso (1,500 RWF) or Plain Beef Burger (4,000 RWF).";

  if (msg.includes("menu"))
    return "📋 We serve Coffee, Tea, Juice, Burgers, Chicken, Fish & Pizza. Ask any item name!";

  for (let item of cafe.menu) {
    if (msg.includes(item.name.toLowerCase())) {
      return `💰 ${item.name} costs ${item.price} RWF`;
    }
  }

  return "🤍 I can help with menu prices, location, hours & recommendations.";
}

// ================== SEND MESSAGE ==================
chatInput.addEventListener("keypress", e => {
  if (e.key === "Enter" && chatInput.value.trim() !== "") {
    const userMsg = chatInput.value;
    addUserMessage(userMsg);

    const reply = getBotReply(userMsg);
    addBotMessage(reply);

    chatInput.value = "";
  }
});

// ================== MESSAGE UI ==================
function addUserMessage(text) {
  chatBody.innerHTML += `<div class="msg-user"><span>${text}</span></div>`;
  chatBody.scrollTop = chatBody.scrollHeight;
}

function addBotMessage(text) {
  chatBody.innerHTML += `<div class="msg-bot"><span><b>Lea 🤍:</b> ${text}</span></div>`;
  chatBody.scrollTop = chatBody.scrollHeight;
}







