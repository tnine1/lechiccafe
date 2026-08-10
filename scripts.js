/* ==========================================================
   LE CHIC CAFÉ - PROFESSIONAL MAIN APPLICATION SCRIPT
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // --- STATE & DATA ---
  let cart = [];
  const currencySymbol = "RF ";

  // DOM Elements
  const menuGrid = document.getElementById("menuGrid");
  const menuSearch = document.getElementById("menuSearch");
  const cartBtn = document.getElementById("cartBtn");
  const cartCount = document.getElementById("cartCount");
  const cartModal = document.getElementById("cartModal");
  const closeCart = document.getElementById("closeCart");
  const cartItemsContainer = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");
  const clearCartBtn = document.getElementById("clearCartBtn");
  const placeOrderBtn = document.getElementById("placeOrderBtn");
  const customerNameInput = document.getElementById("customerName");
  const customerPhoneInput = document.getElementById("customerPhone");
  const customerNotesInput = document.getElementById("customerNotes");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  
  // Chatbot Elements
  const chatbot = document.getElementById("chatbot");
  const chatToggle = document.getElementById("chatToggle");
  const closeChat = document.getElementById("closeChat");
  const chatBody = document.getElementById("chatBody");
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");

  // --- INITIALIZATION ---
  updateCartUI();
  setupPagination();

  // --- CART FUNCTIONALITY ---
  document.querySelectorAll(".buy-btn").forEach(button => {
    button.addEventListener("click", (e) => {
      const itemCard = e.target.closest(".menu-item");
      const id = itemCard.getAttribute("data-id");
      const name = itemCard.getAttribute("data-name");
      const price = parseFloat(itemCard.getAttribute("data-price"));

      addToCart(id, name, price);
    });
  });

  function addToCart(id, name, price) {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ id, name, price, quantity: 1 });
    }
    updateCartUI();
    
    // Quick feedback animation on cart button
    cartBtn.classList.add("bounce");
    setTimeout(() => cartBtn.classList.remove("bounce"), 300);
  }

  function updateCartUI() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalCount;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = '<p class="muted">Your cart is empty.</p>';
      cartTotal.textContent = "0";
      return;
    }

    let html = "";
    let grandTotal = 0;

    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      grandTotal += itemTotal;
      html += `
        <div class="cart-item-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">
          <div>
            <strong>${item.name}</strong><br>
            <small class="muted">${currencySymbol}${item.price} × ${item.quantity}</small>
          </div>
          <div>
            <span>${currencySymbol}${itemTotal}</span>
            <button class="remove-item-btn" data-id="${item.id}" style="background: none; border: none; color: #ff4d4d; cursor: pointer; margin-left: 10px; font-weight: bold;">✕</button>
          </div>
        </div>
      `;
    });

    cartItemsContainer.innerHTML = html;
    cartTotal.textContent = grandTotal.toLocaleString();

    // Attach remove event listeners
    document.querySelectorAll(".remove-item-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        cart = cart.filter(item => item.id !== id);
        updateCartUI();
      });
    });
  }

  cartBtn.addEventListener("click", () => {
    cartModal.classList.remove("hidden");
  });

  closeCart.addEventListener("click", () => {
    cartModal.classList.add("hidden");
  });

  clearCartBtn.addEventListener("click", () => {
    cart = [];
    updateCartUI();
  });

  // --- ORDER PLACEMENT VIA WHATSAPP ---
  placeOrderBtn.addEventListener("click", () => {
    const name = customerNameInput.value.trim();
    const phone = customerPhoneInput.value.trim();
    const notes = customerNotesInput.value.trim();

    if (!name || !phone) {
      alert("Please provide your name and phone number to send the order.");
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    let message = `*New Order - Le Chic Café*%0A`;
    message += `*Customer:* ${name}%0A`;
    message += `*Phone:* ${phone}%0A`;
    if (notes) message += `*Notes:* ${notes}%0A`;
    message += `%0A*Items:*%0A`;

    let total = 0;
    cart.forEach(item => {
      let sub = item.price * item.quantity;
      total += sub;
      message += `- ${item.name} x${item.quantity} (${currencySymbol}${sub})%0A`;
    });

    message += `%0A*Total: ${currencySymbol}${total.toLocaleString()}*`;

    const whatsappUrl = `https://wa.me/250781043532?text=${message}`;
    window.open(whatsappUrl, "_blank");
    
    // Reset after send
    cart = [];
    updateCartUI();
    cartModal.classList.add("hidden");
  });

  // --- LIVE MENU SEARCH ---
  menuSearch.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    const items = menuGrid.querySelectorAll(".menu-item");

    items.forEach(item => {
      const name = item.getAttribute("data-name").toLowerCase();
      if (name.includes(query)) {
        item.style.display = "flex";
      } else {
        item.style.display = "none";
      }
    });
  });

  // --- LOAD MORE / PAGINATION LOGIC ---
  function setupPagination() {
    const items = menuGrid.querySelectorAll(".menu-item");
    const itemsPerPage = 8;
    let visibleCount = itemsPerPage;

    // Initially hide items beyond the limit unless searched
    items.forEach((item, index) => {
      if (index >= itemsPerPage) {
        item.style.display = "none";
      } else {
        item.style.display = "flex";
      }
    });

    if (items.length <= itemsPerPage) {
      if (loadMoreBtn) loadMoreBtn.style.display = "none";
    }

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => {
        visibleCount += itemsPerPage;
        let shown = 0;
        items.forEach((item, index) => {
          if (index < visibleCount) {
            item.style.display = "flex";
            shown++;
          }
        });

        if (visibleCount >= items.length) {
          loadMoreBtn.style.display = "none";
        }
      });
    }
  }

  // --- VIRTUAL ASSISTANT (CIERO CHATBOT) ---
  const chatToggleBtn = document.getElementById("chatToggle");
  
  if (chatToggleBtn) chatToggleBtn.style.display = "block";

  if (chatToggleBtn) {
    chatToggleBtn.addEventListener("click", () => {
      chatbot.classList.remove("hidden");
      chatToggleBtn.style.display = "none";
    });
  }

  if (closeChat) {
    closeChat.addEventListener("click", () => {
      chatbot.classList.add("hidden");
      if (chatToggleBtn) chatToggleBtn.style.display = "block";
    });
  }

  function handleChat() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Append User Message
    const userMsg = document.createElement("div");
    userMsg.className = "msg-user";
    userMsg.textContent = text;
    chatBody.appendChild(userMsg);
    chatInput.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;

    // Bot Response Logic
    setTimeout(() => {
      const botMsg = document.createElement("div");
      botMsg.className = "msg-bot";
      
      const lowerText = text.toLowerCase();
      let response = "I'm here to help! You can ask about our coffee, juices, pricing, or location 😊";

      if (lowerText.includes("price") || lowerText.includes("cost") || lowerText.includes("how much")) {
        response = "Our espresso starts at 1,500 RWF, cappuccinos are 2,500 RWF, and main dishes range from 5,000 to 8,000 RWF.";
      } else if (lowerText.includes("location") || lowerText.includes("where") || lowerText.includes("find")) {
        response = "Le Chic Café is located in Kigali. You can check the interactive map in our Contact section!";
      } else if (lowerText.includes("open") || lowerText.includes("hours") || lowerText.includes("time")) {
        response = "We are open daily from early morning for breakfast until late evening!";
      } else if (lowerText.includes("coffee") || lowerText.includes("espresso")) {
        response = "We serve fresh, locally sourced espresso beverages including Single Espresso, Café Latte, and Cappuccino.";
      }

      botMsg.innerHTML = `<b>Ciero 🤍:</b> <span>${response}</span>`;
      chatBody.appendChild(botMsg);
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 600);
  }

  if (sendBtn) sendBtn.addEventListener("click", handleChat);
  if (chatInput) {
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleChat();
    });
  }
});
