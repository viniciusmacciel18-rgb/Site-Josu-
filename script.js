const products = [
  {
    id: "costela",
    name: "Hambúrguer Costela Nobre",
    badge: "Churrasco / Parrilla",
    description: "Sabor marcante e suculência que combinam com a brasa.",
    unitPriceCents: 640,
    image: "image/images%20(1).jpg",
    alt: "Hambúrgueres artesanais crus, apresentados sobre uma tábua"
  },
  {
    id: "tradicional",
    name: "Hambúrguer Tradicional Feitoza",
    badge: "Chapa & Grelha",
    description: "Equilibrado e versátil, vai bem na chapa ou na churrasqueira.",
    unitPriceCents: 500,
    image: "image/images.jpg",
    alt: "Hambúrgueres artesanais embalados para conservar"
  },
  {
    id: "picanha",
    name: "Hambúrguer Picanha Premium",
    badge: "Edição Especial",
    description: "Uma opção especial para quem busca sabor e maciez.",
    unitPriceCents: 990,
    image: "image/images%20(2).jpg",
    alt: "Hambúrgueres artesanais sendo preparados na chapa"
  },
  {
    id: "fraldinha",
    name: "Hambúrguer de Fraldinha Artesanal",
    badge: "Churrasco / Grelha",
    description: "Sabor intenso e textura suculenta para sua próxima brasa.",
    unitPriceCents: 720,
    image: "image/images%20(3).jpg",
    alt: "Hambúrgueres artesanais preparados na grelha"
  },
  {
    id: "angus",
    name: "Hambúrguer Angus Premium",
    badge: "Edição Especial",
    description: "Uma escolha premium para apreciar cada mordida.",
    unitPriceCents: 1200,
    image: "image/images%20(1).jpg",
    alt: "Hambúrguer artesanal cru, pronto para preparar"
  },
  {
    id: "brisket",
    name: "Hambúrguer Brisket Artesanal",
    badge: "Churrasco / Parrilla",
    description: "Sabor encorpado para acompanhar o calor da churrasqueira.",
    unitPriceCents: 850,
    image: "image/images%20(2).jpg",
    alt: "Hambúrguer grelhado com acompanhamentos"
  }
];

const weights = [160, 200, 240, 280];
const whatsappNumber = "5547997221504";
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const cartStorageKey = "burguer-feitoza-cart";
let cart = loadCart();
let toastTimer;

const productGrid = document.querySelector("#product-grid");
const cartCount = document.querySelector("#cart-count");
const cartItems = document.querySelector("#cart-items");
const drawerFooter = document.querySelector("#drawer-footer");
const cartSubtotal = document.querySelector("#cart-subtotal");
const drawer = document.querySelector("#cart-drawer");
const backdrop = document.querySelector("#cart-backdrop");
const toast = document.querySelector("#toast");
const menuToggle = document.querySelector("#menu-toggle");
const dropdownMenu = document.querySelector("#dropdown-menu");
const checkoutButton = document.querySelector("#checkout-button");

function formatPrice(cents) {
  return currency.format(cents / 100);
}

function loadCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
    if (!Array.isArray(savedCart)) return [];
    return savedCart.filter((item) =>
      products.some((product) => product.id === item.productId)
      && weights.includes(item.weight)
      && [6, 10].includes(item.pack)
      && Number.isInteger(item.quantity)
      && item.quantity > 0
    );
  } catch (error) {
    console.error("Não foi possível recuperar o carrinho salvo.", error);
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  } catch (error) {
    console.error("Não foi possível salvar o carrinho.", error);
    showToast("Não foi possível salvar seu carrinho neste navegador.");
  }
}

function renderProducts() {
  productGrid.innerHTML = products.map((product) => `
    <article class="product-card" data-product-id="${product.id}">
      <div class="card-image">
        <img src="${product.image}" alt="${product.alt}" loading="lazy" decoding="async">
        <span class="card-badge">${product.badge}</span>
      </div>
      <div class="card-body">
        <h3>${product.name}</h3>
        <p class="card-description">${product.description}</p>
        <p class="unit-price">${formatPrice(product.unitPriceCents)} <small>por hambúrguer</small></p>
        <span class="selector-label">Gramatura de cada hambúrguer</span>
        <div class="gram-options" role="group" aria-label="Gramatura de ${product.name}">
          ${weights.map((weight, index) => `<button class="gram-option${index === 1 ? " active" : ""}" type="button" data-weight="${weight}" aria-pressed="${index === 1}">${weight}g</button>`).join("")}
        </div>
        <div class="card-controls">
          <label class="control-label">Pack
            <select class="pack-select" aria-label="Unidades por pack de ${product.name}">
              <option value="6">6 unidades</option>
              <option value="10">10 unidades</option>
            </select>
          </label>
          <label class="control-label">Quantidade de packs
            <input class="quantity-input" type="number" min="1" step="1" value="1" inputmode="numeric" aria-label="Quantidade de packs de ${product.name}">
          </label>
        </div>
        <output class="pack-summary" aria-live="polite"></output>
        <button class="add-to-cart" type="button" data-action="add" data-product-id="${product.id}">Adicionar ao carrinho <span aria-hidden="true">↗</span></button>
      </div>
    </article>`).join("");
  productGrid.querySelectorAll(".product-card").forEach(updatePackSummary);
}

function updatePackSummary(card) {
  const product = products.find((item) => item.id === card.dataset.productId);
  const packSize = Number(card.querySelector(".pack-select").value);
  const requestedQuantity = Number(card.querySelector(".quantity-input").value);
  const quantity = Number.isInteger(requestedQuantity) && requestedQuantity > 0 ? requestedQuantity : 1;
  const summary = card.querySelector(".pack-summary");
  summary.textContent = `${packSize * quantity} hambúrgueres · ${formatPrice(product.unitPriceCents * packSize * quantity)}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2600);
}

function addToCart(productId, weight, packSize, quantity) {
  const key = `${productId}-${weight}-${packSize}`;
  const existing = cart.find((item) => item.key === key);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ key, productId, weight, pack: packSize, quantity });
  }
  saveCart();
  renderCart();
  showToast("Pack adicionado ao carrinho.");
}

function renderCart() {
  const packCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotalCents = cart.reduce((total, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return total + product.unitPriceCents * item.pack * item.quantity;
  }, 0);
  cartCount.textContent = `${packCount} ${packCount === 1 ? "pack" : "packs"}`;
  cartCount.setAttribute("aria-label", `${packCount} ${packCount === 1 ? "pack" : "packs"} no carrinho`);
  drawerFooter.hidden = cart.length === 0;
  cartSubtotal.textContent = formatPrice(subtotalCents);

  if (cart.length === 0) {
    cartItems.innerHTML = `<div class="empty-cart"><span>✳</span><p>Seu carrinho está vazio.<br>Que tal escolher seu burger?</p><button class="text-link" id="continue-shopping" type="button">Ver nossos hambúrgueres ↗</button></div>`;
    return;
  }

  cartItems.innerHTML = cart.map((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    const itemCents = product.unitPriceCents * item.pack * item.quantity;
    return `
      <article class="cart-item">
        <div><h3>${product.name}</h3><p>${item.weight}g · Pack com ${item.pack} unidades · ${item.quantity} ${item.quantity === 1 ? "pack" : "packs"}</p></div>
        <span class="cart-item-price">${formatPrice(itemCents)}</span>
        <div class="cart-item-controls">
          <div class="quantity-control" aria-label="Quantidade de packs de ${product.name}">
            <button type="button" data-action="decrease" data-key="${item.key}" aria-label="Diminuir quantidade">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-action="increase" data-key="${item.key}" aria-label="Aumentar quantidade">+</button>
          </div>
          <button type="button" class="remove-item" data-action="remove" data-key="${item.key}">Remover</button>
        </div>
      </article>`;
  }).join("");
}


function buildWhatsappLink(orderItems = cart) {
  const subtotal = orderItems.reduce((total, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return total + product.unitPriceCents * item.pack * item.quantity;
  }, 0);

  const lines = orderItems.map((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return `- ${product.name}, ${item.weight}g: ${item.quantity} pack(s) de ${item.pack} unidades — ${formatPrice(product.unitPriceCents * item.pack * item.quantity)}`;
  });

  const message = [
    "Olá, Burguer Feitoza! Gostaria de fazer um pedido:",
    "",
    ...lines,
    "",
    `Total dos produtos: ${formatPrice(subtotal)}`,
    "Por favor, confirmem disponibilidade, pagamento e entrega."
  ].join("\n");

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function openCart() {
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  backdrop.hidden = false;
  document.body.classList.add("cart-open");
  document.querySelector("#close-cart").focus();
}

function closeCart() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  backdrop.hidden = true;
  document.body.classList.remove("cart-open");
  document.querySelector("#open-cart").focus();
}

function closeMenu() {
  menuToggle.setAttribute("aria-expanded", "false");
  dropdownMenu.hidden = true;
}

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  dropdownMenu.hidden = isOpen;
});

dropdownMenu.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".menu-wrap")) closeMenu();
});

productGrid.addEventListener("click", (event) => {
  const weightButton = event.target.closest(".gram-option");
  if (weightButton) {
    const card = weightButton.closest(".product-card");
    card.querySelectorAll(".gram-option").forEach((option) => {
      const selected = option === weightButton;
      option.classList.toggle("active", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
    return;
  }

  const addButton = event.target.closest("[data-action='add']");
  if (!addButton) return;
  const card = addButton.closest(".product-card");
  const quantityInput = card.querySelector(".quantity-input");
  const parsedQuantity = Number(quantityInput.value);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
    quantityInput.value = "1";
    updatePackSummary(card);
    quantityInput.focus();
    showToast("Informe uma quantidade válida de packs.");
    return;
  }
  const weight = Number(card.querySelector(".gram-option.active").dataset.weight);
  const packSize = Number(card.querySelector(".pack-select").value);
  addToCart(card.dataset.productId, weight, packSize, parsedQuantity);
});

productGrid.addEventListener("change", (event) => {
  const card = event.target.closest(".product-card");
  if (card && event.target.matches(".pack-select")) updatePackSummary(card);
});
productGrid.addEventListener("input", (event) => {
  const card = event.target.closest(".product-card");
  if (card && event.target.matches(".quantity-input")) updatePackSummary(card);
});

document.querySelector("#quick-order").addEventListener("click", () => {
  addToCart("tradicional", 200, 6, 1);
  openCart();
});
document.querySelector("#open-cart").addEventListener("click", openCart);
document.querySelector("#close-cart").addEventListener("click", closeCart);
backdrop.addEventListener("click", closeCart);

checkoutButton.addEventListener("click", () => {
  if (cart.length === 0 || checkoutButton.disabled) return;

  const orderItems = cart.map(({ productId, weight, pack, quantity }) => ({
    productId,
    weight,
    pack,
    quantity
  }));

  const whatsappUrl = buildWhatsappLink(orderItems);

  const whatsappWindow = window.open(whatsappUrl, "_blank");

  if (!whatsappWindow) {
    showToast("Permita a abertura de janelas para enviar seu pedido.");
  }
});
cartItems.addEventListener("click", (event) => {
  if (event.target.closest("#continue-shopping")) {
    closeCart();
    document.querySelector("#catalogo").scrollIntoView({ behavior: "smooth" });
    return;
  }
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const item = cart.find((entry) => entry.key === button.dataset.key);
  if (!item) return;
  if (button.dataset.action === "increase") item.quantity += 1;
  if (button.dataset.action === "decrease") item.quantity -= 1;
  if (button.dataset.action === "remove" || item.quantity <= 0) {
    cart = cart.filter((entry) => entry.key !== item.key);
  }
  saveCart();
  renderCart();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (drawer.classList.contains("open")) closeCart();
    closeMenu();
  }
});

renderProducts();
renderCart();
