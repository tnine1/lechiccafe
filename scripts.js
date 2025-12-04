// ----------------------------
// SIMPLE CLASSIC CART SYSTEM
// ----------------------------

// Elements
const cartBtn = document.getElementById("cartBtn");
const cartModal = document.getElementById("cartModal");
const closeCart = document.getElementById("closeCart");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const clearCartBtn = document.getElementById("clearCartBtn");
const placeOrderBtn = document.getElementById("placeOrderBtn");

const nameInput = document.getElementById("customerName");
const phoneInput = document.getElementById("customerPhone");
const notesInput = document.getElementById("customerNotes");

// Cart data
let cart = JSON.parse(localStorage.getItem("cart")) || {};

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// Render cart UI
function renderCart() {
  cartItems.innerHTML = "";
  let total = 0;

  Object.values(cart).forEach(item => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <span>${item.name} (x${item.qty})</span>
      <span>RF ${item.price * item.qty}</span>
    `;
    cartItems.appendChild(div);
    total += item.price * item.qty;
  });

  cartTotal.textContent = total;
  document.getElementById("cartCount").textContent = Object.keys(cart).length;
}

renderCart();

// Add to cart
document.querySelectorAll(".buy-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    const item = this.closest(".menu-item");
    const id = item.dataset.id;
    const name = item.dataset.name;
    const price = Number(item.dataset.price);

    if (!cart[id]) {
      cart[id] = { id, name, price, qty: 1 };
    } else {
      cart[id].qty++;
    }

    saveCart();
    renderCart();
  });
});

// Open & close cart
cartBtn.onclick = () => cartModal.classList.remove("hidden");
closeCart.onclick = () => cartModal.classList.add("hidden");

// Clear cart
clearCartBtn.onclick = () => {
  cart = {};
  saveCart();
  renderCart();
};

// ----------------------------
// SEND ORDER → EMAIL ONLY
// ----------------------------
placeOrderBtn.onclick = () => {
  if (!nameInput.value.trim()) return alert("Please enter your name.");
  if (!phoneInput.value.trim()) return alert("Please enter your phone.");
  if (Object.keys(cart).length === 0) return alert("Your cart is empty.");

  let message = `New Order — Le Chic Cafe\n\n`;
  message += `Name: ${nameInput.value}\n`;
  message += `Phone: ${phoneInput.value}\n`;
  if (notesInput.value.trim()) {
    message += `Notes: ${notesInput.value.trim()}\n`;
  }
  message += `\nOrder Items:\n`;

  Object.values(cart).forEach(item => {
    message += `- ${item.name} x${item.qty} = RF ${item.price * item.qty}\n`;
  });

  message += `\nTotal: RF ${cartTotal.textContent}`;

  const email = "lechiccafe.info@gmail.com";

  window.location.href =
    `mailto:${email}?subject=New Order&body=${encodeURIComponent(message)}`;

  alert("Order sent to email!");

  cart = {};
  saveCart();
  renderCart();
  cartModal.classList.add("hidden");
};
