// Configuration - set your real email and optional WhatsApp fallback
const CONFIG = {
    emailAddress: "lechiccafe.info@gmail.com", // set your cafe email
    whatsappNumber: "250781043532", // Phone number for wa.me link (country code + number, no '+')
    cafeName: "Le Chic Cafe",
    locationNote: "Pickup at counter",
    address: "Kicukiro, Kigali, Rwanda"
};

// FormSubmit helper endpoint
function formSubmitEndpoint(email) {
    return `https://formsubmit.co/ajax/${encodeURIComponent(email)}`;
}

// Global scope cart state (needed for getQueryParams update)
const cart = {};

// Utility: format money (RWF no decimals)
function formatMoney(n) {
    // if prices are large integers, format with commas
    return Number(n).toLocaleString();
}

// Escape helper to avoid HTML injection in item names
function escapeHtml(s) 
// --- GPS helper (non-blocking, safe) ---
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

{
    return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// Function to get query parameters (for direct 'Buy Now' links)
function getQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        item: urlParams.get("item"),
        price: urlParams.get("price"),
    };
}

// Function to render the cart in the modal
function renderCart() {
    const cartItemsEl = document.getElementById("cartItems");
    const cartTotalEl = document.getElementById("cartTotal");
    const cartCountEl = document.getElementById("cartCount");

    // Helper for quantity buttons (defined within renderCart scope for access to cart/renderCart)
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
                if (cart[id].qty <= 0) delete cart[id];
                renderCart();
            });
        });
    }

    // Empty
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
    cartCountEl.textContent = Object.values(cart).reduce((s, it) => s + it.qty, 0);
    wireQtyButtons();
}

// Cart open/close functions
function openCart() {
    const cartModal = document.getElementById("cartModal");
    if (cartModal) cartModal.classList.remove("hidden");
}
function closeCart() {
    const cartModal = document.getElementById("cartModal");
    if (cartModal) cartModal.classList.add("hidden");
}

// Build order message text (used for both email and WhatsApp)
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
    if (customer.location && customer.location.mapLink) {
    lines.push(`Customer Location: ${customer.location.mapLink}`);
} else {
    lines.push(`Customer Location: Not shared`);
}

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

// Send order to WhatsApp via wa.me link
function sendOrderToWhatsapp(orderObj, customer) {
    if (!CONFIG.whatsappNumber) {
        console.warn("No WhatsApp number configured in CONFIG.whatsappNumber");
        return;
    }
    // Build the message and URL
    const rawMessage = buildOrderMessage(orderObj, customer);
    // Add a prompt/header specific to WhatsApp
    const encodedMessage = encodeURIComponent(`*New Order for Confirmation*\n${rawMessage}\n\n*Please confirm and arrange pickup.*`);
    
    // Use wa.me link with the phone number and encoded message
    const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodedMessage}`;
    
    // Open the URL in a new window/tab
    window.open(whatsappUrl, '_blank');
}


// --- MAIN DOM CONTENT LOADED ---
document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const cartBtn = document.getElementById("cartBtn");
    const closeCartBtn = document.getElementById("closeCart");
    const placeOrderBtn = document.getElementById("placeOrderBtn");
    const clearCartBtn = document.getElementById("clearCartBtn");
    const nameInput = document.getElementById("customerName");
    const phoneInput = document.getElementById("customerPhone");
    const notesInput = document.getElementById("customerNotes");
    const emailText = document.getElementById("emailText");
    const yearEl = document.getElementById("year");

    if (emailText) emailText.textContent = CONFIG.emailAddress;
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // --- 1. Handle Query Params (for single item 'buy now' links) ---
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

    // --- 2. Attach Buy Now buttons ---
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

    // --- 3. Cart open/close listeners ---
    if (cartBtn) cartBtn.addEventListener("click", () => {
        renderCart();
        openCart();
    });
    if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);

    // --- 4. Clear cart ---
    if (clearCartBtn) clearCartBtn.addEventListener("click", () => {
        Object.keys(cart).forEach(k => delete cart[k]);
        renderCart();
    });

    // --- 5. Place Order button action ---
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
            const location = await getCustomerLocation();

// prepare customer object
const customer = { name, phone, notes, location };

            // disable button to prevent duplicates
            placeOrderBtn.disabled = true;
            placeOrderBtn.textContent = "Sending...";

            try {
                // 1. Send to Email
                await sendOrderToEmail(cart, customer);
                
                // 2. Open WhatsApp (only on successful email send)
                sendOrderToWhatsapp(cart, customer);
                
                // Success: clear cart and show confirmation
                Object.keys(cart).forEach(k => delete cart[k]);
                renderCart();
                closeCart();
                alert("✅ Success! Your order was sent via email and WhatsApp chat is now opening. Please use WhatsApp to finalize.");
            } catch (err) {
                console.warn("Send failed:", err);
                alert("⚠️ Order sending failed. Please check your internet connection or use the email fallback.");

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

    // --- 6. Close modal on ESC ---
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeCart();
    });

    // --- 7. Sidebar/Menu Toggle ---
    const menuBtn = document.getElementById("menuBtn");
    const sidebar = document.getElementById("sidebar");
    const main = document.querySelector(".main-content");

    if (menuBtn && sidebar && main) {
        menuBtn.onclick = () => {
            sidebar.classList.toggle("active");
            main.classList.toggle("shift");
        };
    }

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


