/* =========================
   CONFIG
========================= */

const menu = {
  hotDrinks: ["Coffee", "Tea", "Hot Chocolate"],
  icedDrinks: ["Iced Coffee", "Iced Tea"],
  juices: ["Passion Juice", "Pineapple Juice", "Tree Tomato Juice"],
  smoothies: ["Banana Smoothie", "Strawberry Smoothie", "Le Chic Café Shake"],
  milkshakes: ["Vanilla", "Chocolate", "Oreo"],
  healthy: ["Fruits Plate", "Macedoine"],
  breakfast: ["Toast", "Sandwich", "Omelette"],
  lunch: ["Rice", "Spaghetti", "Wraps", "Chicken", "Beef"],
  dinner: ["Pizza", "Burgers", "Salads", "Fish"]
};

/* =========================
   ELEMENTS
========================= */

const params = new URLSearchParams(window.location.search);
const table = params.get("table");

const statusText = document.getElementById("status");
const menuDiv = document.getElementById("menu");
const spinner = document.querySelector(".spinner");
const sound = document.getElementById("notifySound");

/* =========================
   VALIDATION
========================= */

if (!table || isNaN(table) || table < 1 || table > 50) {
  statusText.innerHTML = "Invalid QR Code.";
  spinner.style.display = "none";
  throw new Error("Invalid table");
}

/* =========================
   FUNCTIONS
========================= */

function notifyStaff(table) {
  if (!window.emailjs) return;

  emailjs.send("service_id","template_id",{
    table_number: table,
    time: new Date().toLocaleString()
  }).catch(()=>{});
}

function renderMenu(items) {
  menuDiv.innerHTML = "";

  for (const category in menu) {
    const filtered = menu[category].filter(i => items.includes(i));
    if (!filtered.length) continue;

    const cat = document.createElement("div");
    cat.className = "menu-category";
    cat.textContent = category;
    menuDiv.appendChild(cat);

    filtered.forEach(item => {
      const div = document.createElement("div");
      div.className = "menu-item";
      div.innerHTML = "✅ " + item;
      menuDiv.appendChild(div);
    });
  }
}

function getTimeSuggestions() {
  const hour = new Date().getHours();
  let set = new Set();

  if (hour < 11) {
    menu.breakfast.forEach(i => set.add(i));
    menu.hotDrinks.forEach(i => set.add(i));
  } else if (hour < 15) {
    menu.lunch.forEach(i => set.add(i));
  } else {
    menu.dinner.forEach(i => set.add(i));
  }

  return set;
}

/* =========================
   INIT
========================= */

statusText.innerHTML = "Preparing your personalized menu...";
notifyStaff(table);

let suggested = getTimeSuggestions();

/* Weather (optional enhancement) */
fetch("https://api.openweathermap.org/data/2.5/weather?q=Kigali&units=metric&appid=YOUR_API_KEY")
.then(res => res.json())
.then(data => {

  const temp = data.main.temp;
  const weather = data.weather[0].main.toLowerCase();

  if (weather.includes("rain")) {
    menu.hotDrinks.forEach(i => suggested.add(i));
  }

  if (temp > 25) {
    menu.juices.forEach(i => suggested.add(i));
    menu.smoothies.forEach(i => suggested.add(i));
  }

})
.catch(()=>{})
.finally(() => {
  renderMenu([...suggested]);
  spinner.style.display = "none";
  statusText.innerHTML = `Welcome! Staff notified for Table ${table}`;
  sound.play().catch(()=>{});
});

/* =========================
   PDF VIEWER (LAZY LOAD)
========================= */

const openPdfBtn = document.getElementById("openPdf");
const pdfContainer = document.getElementById("pdfContainer");

let pdfLoaded = false;
let pdfDoc = null, pageNum = 1;
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

document.getElementById("pdfViewer").appendChild(canvas);

function renderPage(num) {
  pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale: 1.2 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    page.render({ canvasContext: ctx, viewport });
    document.getElementById("pageInfo").textContent =
      `Page ${num} / ${pdfDoc.numPages}`;
  });
}

openPdfBtn.onclick = () => {
  const visible = pdfContainer.style.display === "block";

  pdfContainer.style.display = visible ? "none" : "block";
  openPdfBtn.textContent = visible ? "📖 View Full Menu" : "❌ Close Menu";

  if (!pdfLoaded) {
    pdfjsLib.getDocument("le-chic-menu.pdf").promise.then(pdf => {
      pdfDoc = pdf;
      renderPage(pageNum);
    });
    pdfLoaded = true;
  }
};

document.getElementById("prevPage").onclick = () => {
  if (pageNum <= 1) return;
  pageNum--;
  renderPage(pageNum);
};

document.getElementById("nextPage").onclick = () => {
  if (pageNum >= pdfDoc.numPages) return;
  pageNum++;
  renderPage(pageNum);
};

/* =========================
   CHAT
========================= */

const chatToggle = document.getElementById("chat-toggle");
const chatBox = document.getElementById("chat-box");
const chatClose = document.getElementById("chat-close");

chatToggle.onclick = () => chatBox.style.display = "block";
chatClose.onclick = () => chatBox.style.display = "none";
