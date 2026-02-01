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


// ================== CHAT TOGGLE ==================
const chatToggle = document.getElementById("chatToggle");
const chatbot = document.getElementById("chatbot");
const chatBody = document.getElementById("chatBody");
const chatInput = document.getElementById("chatInput");
const closeChat = document.getElementById("closeChat");


if (chatToggle && chatbot) {
  chatToggle.addEventListener("click", () => {
    chatbot.classList.remove("hidden");
    chatToggle.style.display = "none";
  });
}

if (closeChat && chatbot) {
  closeChat.addEventListener("click", () => {
    chatbot.classList.add("hidden");
    chatToggle.style.display = "block";
  });
}

// ================== CAFE INFO ==================
const cafe = {
  name: "Le Chic Café",
  location: "Kicukiro, second building after Simba Traffic Light",
  hours: "Open 24/7, Monday to Sunday",
  phone: ["+250 781 043 532", "+250 783 662 228"],
  email: "lechiccafe.info@gmail.com",
  website: "https://tnine1.github.io/lechiccafe/",

  // ================== MENU ==================
  menu: [

    /* ================= HOT DRINKS – COFFEE ================= */
    { name:"Single Espresso", price:1500, category:"Coffee" },
    { name:"Double Espresso", price:2000, category:"Coffee" },
    { name:"Americano", price:2000, category:"Coffee" },
    { name:"Black Coffee", price:2000, category:"Coffee" },
    { name:"Black Coffee Strong", price:2000, category:"Coffee" },
    { name:"Café Latte", price:2500, category:"Coffee" },
    { name:"Cappuccino", price:2500, category:"Coffee" },
    { name:"Cappuccino Big", price:3000, category:"Coffee" },
    { name:"Strong Cappuccino", price:3000, category:"Coffee" },
    { name:"Macchiato", price:2000, category:"Coffee" },
    { name:"Café Mocha", price:3000, category:"Coffee" },
    { name:"Affogato", price:3000, category:"Coffee" },
    { name:"Flat White", price:2500, category:"Coffee" },
    { name:"Customized Coffee", price:3500, category:"Coffee" },
    { name:"African Coffee", price:3000, category:"Coffee" },
    { name:"Hot Chocolate", price:2500, category:"Coffee" },
    { name:"Vanilla Latte", price:3000, category:"Coffee" },
    { name:"Caramel Macchiato", price:3000, category:"Coffee" },
    { name:"Cappuccino Frappee", price:3000, category:"Coffee" },
    { name:"Vanilla Frappee", price:4000, category:"Coffee" },

    /* ================= ICED COFFEE ================= */
    { name:"Iced Cream Coffee", price:5000, category:"Iced Coffee" },
    { name:"Iced Vanilla Latte", price:4000, category:"Iced Coffee" },
    { name:"Iced Latte", price:3000, category:"Iced Coffee" },
    { name:"Iced Cappuccino", price:3000, category:"Iced Coffee" },
    { name:"Iced Mocha", price:3500, category:"Iced Coffee" },
    { name:"Iced Americano", price:2500, category:"Iced Coffee" },
    { name:"Iced Frappuccino", price:3500, category:"Iced Coffee" },
    { name:"Iced Mocha Frappe", price:4000, category:"Iced Coffee" },
    { name:"Iced Black Coffee", price:2500, category:"Iced Coffee" },
    { name:"Iced Vanilla Frappee", price:4000, category:"Iced Coffee" },

    /* ================= TEA ================= */
    { name:"Black Tea", price:2000, category:"Tea" },
    { name:"Green Tea", price:2000, category:"Tea" },
    { name:"African Tea", price:2500, category:"Tea" },
    { name:"Ginger Tea", price:2500, category:"Tea" },
    { name:"Lemon Tea", price:2000, category:"Tea" },
    { name:"Hot Milk", price:2000, category:"Tea" },
    { name:"Hot Water + Lemon", price:1500, category:"Tea" },
    { name:"Hot Water", price:1000, category:"Tea" },
    { name:"Fresh Milk", price:2000, category:"Tea" },
    { name:"Spice Tea", price:3000, category:"Tea" },
    { name:"Mint Tea", price:3000, category:"Tea" },
    { name:"Russian Tea", price:2500, category:"Tea" },
    { name:"Dawa Tea", price:3500, category:"Tea" },

    /* ================= JUICES ================= */
    { name:"Passion Juice", price:3500, category:"Juice" },
    { name:"Mango Juice", price:5000, category:"Juice" },
    { name:"Pineapple Juice", price:3500, category:"Juice" },
    { name:"Tree Tomato Juice", price:3500, category:"Juice" },
    { name:"Orange Juice", price:4000, category:"Juice" },
    { name:"Mocktail Juice", price:5000, category:"Juice" },
    { name:"Detox Juice", price:5500, category:"Juice" },
    { name:"Create Own Juice", price:5500, category:"Juice" },
    { name:"Cocktail Juice", price:4500, category:"Juice" },
    { name:"Mojito Juice", price:6000, category:"Juice" },

    /* ================= SMOOTHIES ================= */
    { name:"Le Chic Café Special Smoothie", price:6000, category:"Smoothie" },
    { name:"Mango Berry Smoothie", price:5000, category:"Smoothie" },
    { name:"Banana Smoothie", price:5000, category:"Smoothie" },
    { name:"Tango Mango Smoothie", price:5000, category:"Smoothie" },
    { name:"Strawberry Smoothie", price:5000, category:"Smoothie" },
    { name:"Tropical Smoothie", price:5000, category:"Smoothie" },
    { name:"Special Mango Smoothie", price:5500, category:"Smoothie" },

    /* ================= MILK SHAKES ================= */
    { name:"Vanilla Shake", price:4500, category:"Milkshake" },
    { name:"Chocolate Shake", price:4500, category:"Milkshake" },
    { name:"Strawberry Shake", price:4500, category:"Milkshake" },
    { name:"Le Chic Café Shake", price:5000, category:"Milkshake" },
    { name:"Oreo Shake", price:6000, category:"Milkshake" },

    /* ================= HEALTHY ================= */
    { name:"Macedoine", price:4000, category:"Healthy" },
    { name:"Fruit Platter", price:5500, category:"Healthy" },
    { name:"Macedoine with Ice Cream", price:5000, category:"Healthy" },
    { name:"Ice Cream One Scoop", price:1000, category:"Healthy" },
    { name:"Ice Cream Fruit", price:8000, category:"Healthy" },

    /* ================= SOFT DRINKS ================= */
    { name:"Big Water", price:1500, category:"Soft Drink" },
    { name:"Mineral Water", price:1000, category:"Soft Drink" },
    { name:"Plastic Water", price:1500, category:"Soft Drink" },
    { name:"Small Fanta", price:1000, category:"Soft Drink" },
    { name:"Tonic Fanta", price:1500, category:"Soft Drink" },
    { name:"Vitalo Sparkling Water", price:1500, category:"Soft Drink" },

    /* ================= BREAKFAST ================= */
    { name:"3 Fried Eggs with Toast Bread", price:5000, category:"Breakfast" },
    { name:"Sausage with Chips and Salad", price:5500, category:"Breakfast" },
    { name:"Le Chic Café Pancakes with Plain Omelette", price:6500, category:"Breakfast" },
    { name:"Scrambled Eggs with Toast Bread", price:5000, category:"Breakfast" },
    { name:"Cheese and Mushroom with Potato Wedges", price:4500, category:"Breakfast" },
    { name:"Spinach Omelette with Potato Wedges or Toast", price:7000, category:"Breakfast" },
    { name:"Spanish Omelette with Toasted Bread", price:5000, category:"Breakfast" },
    { name:"Special Omelette", price:5000, category:"Breakfast" },

    /* ================= WRAPS ================= */
    { name:"Chapati Rolex", price:4000, category:"Wraps" },
    { name:"Vegetable Chapati Rolex", price:5000, category:"Wraps" },
    { name:"Steak Omelette", price:7000, category:"Wraps" },
    { name:"Chicken Wrap", price:5500, category:"Wraps" },
    { name:"Fish Wrap", price:6500, category:"Wraps" },
    { name:"Beef Wrap", price:5000, category:"Wraps" },
    { name:"Vegetable Wrap", price:4000, category:"Wraps" },
    { name:"Chicken Mozzarella Wrap", price:6500, category:"Wraps" },

    /* ================= KIDS ================= */
    { name:"Chicken Nuggets with Chips", price:6500, category:"Kids" },
    { name:"Kids Beef Spaghetti", price:6000, category:"Kids" },
    { name:"Hot Dogs and Chips", price:6000, category:"Kids" }
  ]
};

// ======================
// LE CHIC CAFÉ CHATBOT
// ======================

// ---- Add Bot Message (typing effect) ----
function addBotMessage(text, typingSpeed = 24) {
  if (!chatBody) return;
  const msgDiv = document.createElement("div");
  msgDiv.className = "msg-bot";
  // bot message may include simple HTML (line breaks)
  msgDiv.innerHTML = `<b>Lea 🤍:</b> <span class="typing"></span>`;
  chatBody.appendChild(msgDiv);

  const span = msgDiv.querySelector(".typing");
  let i = 0;

  const typingInterval = setInterval(() => {
    if (!span) {
      clearInterval(typingInterval);
      return;
    }
    span.innerHTML += text.charAt(i);
    i++;
    chatBody.scrollTop = chatBody.scrollHeight;

    if (i >= text.length) {
      clearInterval(typingInterval);
      // SAFE: replace innerHTML, not outerHTML
      span.innerHTML = text;
    }
  }, typingSpeed);
}

// ---- Add User Message ----
function addUserMessage(text) {
  if (!chatBody) return;
  const safe = escapeForHtml(text);
  chatBody.innerHTML += `<div class="msg-user">${safe}</div>`;
  chatBody.scrollTop = chatBody.scrollHeight;
}

// ---- Escape HTML ----
function escapeForHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---- Initial Greeting ----
window.addEventListener("load", () => {
  addBotMessage(
    "Hello 👋 Welcome to Le Chic Café ☕<br>Ask me about menu items, prices, recommendations, location, or opening hours 😊"
  );
});

// ======================
// IMPROVED REPLY LOGIC
// ======================

// Normalize input
function normalizeInput(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^\w\s']/g, " ") // remove punctuation but keep apostrophes inside words
    .replace(/\s+/g, " ")
    .trim();
}

// Tokenize
function tokensFrom(s) {
  return s.length === 0 ? [] : s.split(" ").filter(Boolean);
}

// Token-based menu matching
function findMenuMatches(msgNormalized, threshold = 0.45) {
  const msgTokens = tokensFrom(msgNormalized);
  if (msgTokens.length === 0) return [];

  const matches = [];
  for (const item of cafe.menu) {
    const nameTokens = tokensFrom(item.name.toLowerCase());

    // Count how many tokens match exactly
    const hits = nameTokens.filter(nt => msgTokens.includes(nt)).length;

    // Calculate match score as fraction of name tokens matched
    const score = hits / nameTokens.length;

    // Only include items that meet the threshold
    if (score >= threshold) {
      matches.push({ item, score, hits });
    }
  }

  // Sort by score (highest first), then by number of hits
  matches.sort((a, b) => b.score - a.score || b.hits - a.hits);

  // Return only the menu items
  return matches.map(m => m.item);
}

// Recommendations
function pickRecommendations(preferredCategory, limit = 3) {
  let pool = cafe.menu.slice();
  if (preferredCategory) {
    pool = pool.filter(it => (it.category || "").toLowerCase() === preferredCategory.toLowerCase());
    if (pool.length === 0) pool = cafe.menu.slice();
  }
  return pool.slice(0, Math.min(limit, pool.length));
}

// ======================
// ----------------------------
const greetingsDB = [
  { greet: "hi", replies: ["Hello!", "Hi there!", "Hey!"] },
  { greet: "hello", replies: ["Hi!", "Hello!", "Hey there!"] },
  { greet: "hey", replies: ["Hey! How are you?", "Hi!"] },
  { greet: "good morning", replies: ["Good morning! ☀️", "Morning! How are you?"] },
  { greet: "good afternoon", replies: ["Good afternoon! 😊"] },
  { greet: "good evening", replies: ["Good evening! 🌙"] },
  { greet: "how are you", replies: ["I’m good, thank you! How about you?", "Doing well! And you?"] },
];

// ----------------------------
// 2️⃣ Check greetings
// ----------------------------
function checkGreetings(input) {
  const normalized = input.toLowerCase().trim();
  for (const entry of greetingsDB) {
    if (normalized.includes(entry.greet)) {
      const reply = entry.replies[Math.floor(Math.random() * entry.replies.length)];
      return reply;
    }
  }
  return null;
}

// -----------------------
// INTERNET FALLBACK (FREE)
// ======================

// Wikipedia fallback
async function wikiFallback(query) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.extract) return data.extract;
  } catch (e) {
    console.warn("Wiki fallback failed", e);
  }
  return null;
}

async function duckDuckGoFallback(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.AbstractText) return data.AbstractText;
  } catch (e) {
    console.warn("DuckDuckGo fallback failed", e);
  }
  return null;
}

async function numbersFallback(query) {
  // optional: trivia, math facts, dates
  try {
    const res = await fetch(`http://numbersapi.com/${encodeURIComponent(query)}`);
    if (res.ok) return await res.text();
  } catch (e) {
    console.warn("Numbers API failed", e);
  }
  return null;
}

async function countriesFallback(query) {
  try {
    const res = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(query)}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const country = data[0];
      return `Country: ${country.name.common}\nRegion: ${country.region}\nPopulation: ${country.population.toLocaleString()}`;
    }
  } catch (e) {
    console.warn("Countries API failed", e);
  }
  return null;
}

// ======================
// MAIN BOT REPLY LOGIC
// ======================

async function getBotReply(rawMsg) {
  const msg = String(rawMsg || "");
  const normalized = normalizeInput(msg);
  const words = tokensFrom(normalized);

  if (words.length === 0) {
    return "Please type a question — try: <i>espresso price</i>, <i>recommend coffee</i>, or <i>where are you located</i>.";
  }

  // GREETINGS
  const greetingWords = ["hi", "hello", "hey", "hiya", "hola", "good", "morning", "evening"];
  if (words.some(w => greetingWords.includes(w))) {
    return "Hello! 👋 I'm Lea from Le Chic Café. Ask me about the menu, prices, recommendations, our location, or opening hours.";
  }

  // HELP / MENU / LIST
  if (normalized.includes("help") || normalized.includes("menu") || normalized.includes("list")) {
    const categories = Array.from(new Set(cafe.menu.map(it => it.category || "Uncategorized"))).slice(0, 12);
    return `You can ask about specific items or categories. Categories: ${categories.join(", ")}.<br>Examples: <i>iced latte price</i>, <i>recommend juice</i>, <i>menu smoothies</i>.`;
  }

  // CONTACT (phone/email/whatsapp)
  if (normalized.includes("phone") || normalized.includes("contact") || normalized.includes("whatsapp") || normalized.includes("call") || normalized.includes("email")) {
    const phones = (cafe.phone || []).join(", ");
    const email = cafe.email || CONFIG.emailAddress || "";
    const website = cafe.website ? `<br>Website: ${cafe.website}` : "";
    return `You can contact us at: ${phones}${email ? `<br>Email: ${email}` : ""}${website}`;
  }

  // LOCATION / WHERE
  if (normalized.includes("location") || normalized.includes("where") || normalized.includes("located") || normalized.includes("address")) {
    return `We are located at: ${cafe.location || CONFIG.address}.`;
  }

  // OPENING HOURS
  if (normalized.includes("open") || normalized.includes("hours") || normalized.includes("time") || normalized.includes("when")) {
    return `${cafe.hours || "Our opening hours are available on the website."}`;
  }

  // RECOMMENDATIONS
  if (normalized.includes("recommend") || normalized.includes("suggest")) {
    const availableCategories = Array.from(new Set(cafe.menu.map(it => (it.category || "").toLowerCase())));
    const mentionedCategory = availableCategories.find(cat => cat && normalized.includes(cat));
    const recs = pickRecommendations(mentionedCategory, 3);
    const list = recs.map(r => `${r.name} — ${r.price} RWF`);
    const categoryText = mentionedCategory ? ` for ${mentionedCategory}` : "";
    return `I recommend${categoryText}:<br>` + list.join("<br>");
  }

  // PRICE QUESTIONS
  if (/\b(price|how much|cost|how many rfw|how many)\b/.test(normalized)) {
    const matches = findMenuMatches(normalized);
    if (matches.length === 1) {
      const it = matches[0];
      return `${it.name} costs ${it.price} RWF ☕`;
    } else if (matches.length > 1) {
      const list = matches.slice(0, 6).map(m => `${m.name} — ${m.price} RWF`);
      return `I found several items matching that name:<br>${list.join("<br>")}<br>Ask for a specific one for the exact price.`;
    } else {
      return "Please mention the item name to check the price, for example: <i>espresso price</i>.";
    }
  }

  // GENERAL SEARCH
  const matches = findMenuMatches(normalized);
  if (matches.length === 1) {
    const it = matches[0];
    return `${it.name} — ${it.price} RWF — Category: ${it.category || "General"}`;
  } else if (matches.length > 1) {
    const list = matches.slice(0, 8).map(m => `${m.name} — ${m.price} RWF`);
    return "Here are matching items:<br>" + list.join("<br>");
  }

  // =================================
  // INTERNET FALLBACK
  // =================================
  let fallbackAnswer =
    (await wikiFallback(rawMsg)) ||
    (await duckDuckGoFallback(rawMsg)) ||
    (await numbersFallback(rawMsg)) ||
    (await countriesFallback(rawMsg));

  if (fallbackAnswer) return `Here’s what I found 🤍<br>${fallbackAnswer}`;

  // -------- Final fallback --------
  return "Sorry, I couldn’t find a clear answer 🤍<br>Try asking about our menu, prices, location, or opening hours ☕";
}

// ======================
// INPUT HANDLER
// ======================
async function sendMessage() {
  if (!chatInput || !chatInput.value.trim()) return;

  const msg = chatInput.value.trim();
  addUserMessage(msg);
  chatInput.value = "";

  // hide keyboard on mobile
  chatInput.blur();

  const reply = await getBotReply(msg);
  addBotMessage(reply);
}

// ENTER key
if (chatInput) {
  chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });
}

// SEND BUTTON click
const sendBtn = document.getElementById("sendBtn");
if (sendBtn) {
  sendBtn.addEventListener("click", sendMessage);
}

const CACHE_NAME = "lechic-cache-v1";

const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js")
    .then(() => console.log("Service Worker registered"))
    .catch(err => console.log("SW error:", err));
}


