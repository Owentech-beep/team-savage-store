// ===============================
// CART STORAGE
// ===============================

// Get cart from localStorage
function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

// Save cart
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// ===============================
// CART BADGE
// ===============================

function updateCartCount() {
  const cart = getCart();

  const totalItems = cart.reduce((total, item) => {
    return total + item.quantity;
  }, 0);

  // Update all cart badges
  document.querySelectorAll(".cart-count").forEach((badge) => {
    badge.textContent = totalItems;
  });
}

// ===============================
// ADD TO CART
// ===============================

function addToCart(product) {
  const cart = getCart();

  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      ...product,
      quantity: 1,
    });
  }

  saveCart(cart);
  updateCartCount();

  alert(`${product.name} added to cart!`);
}

// ===============================
// RENDER CART PAGE
// ===============================

function renderCartPage() {
  const cartContainer = document.getElementById("cart-items");

  // Stop if we're not on the cart page
  if (!cartContainer) return;

  const cart = getCart();

  // Empty cart
  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="alert alert-secondary">
        Your cart is empty.
      </div>
    `;

    document.getElementById("cart-subtotal").textContent = "R0.00";
    document.getElementById("delivery-fee").textContent = "R0.00";
    document.getElementById("cart-total").textContent = "R0.00";

    return;
  }

  let subtotal = 0;

  cartContainer.innerHTML = cart
    .map((item) => {
      const itemTotal = item.price * item.quantity;

      subtotal += itemTotal;

      return `
      <div class="card mb-3 shadow-sm">
        <div class="card-body d-flex justify-content-between align-items-center">

          <div>
            <h5 class="mb-1">${item.name}</h5>
            <p class="text-muted mb-0">
              Quantity: ${item.quantity}
            </p>
          </div>

          <div class="fw-bold text-warning">
            R${itemTotal.toFixed(2)}
          </div>

        </div>
      </div>
    `;
    })
    .join("");

  const deliveryFee = subtotal > 0 ? 100 : 0;
  const total = subtotal + deliveryFee;

  document.getElementById("cart-subtotal").textContent =
    `R${subtotal.toFixed(2)}`;

  document.getElementById("delivery-fee").textContent =
    `R${deliveryFee.toFixed(2)}`;

  document.getElementById("cart-total").textContent = `R${total.toFixed(2)}`;
}
// ===============================
// RENDER CHECKOUT PAGE
// ===============================

function renderCheckoutPage() {

  const container = document.getElementById("checkout-items");

  if (!container) return;

  const cart = getCart();

  if (cart.length === 0) {

    container.innerHTML = `
      <div class="alert alert-secondary">
        Your cart is empty.
      </div>
    `;

    document.getElementById("checkout-subtotal").textContent = "R0.00";
    document.getElementById("checkout-delivery").textContent = "R0.00";
    document.getElementById("checkout-total").textContent = "R0.00";

    return;
  }

  let subtotal = 0;

  container.innerHTML = cart.map((item) => {

    const itemTotal = item.price * item.quantity;

    subtotal += itemTotal;

    return `
      <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">

        <div>
          <h6 class="mb-1">${item.name}</h6>
          <small class="text-muted">
            Qty: ${item.quantity}
          </small>
        </div>

        <span class="fw-semibold">
          R${itemTotal.toFixed(2)}
        </span>

      </div>
    `;
  }).join("");

  const deliveryFee = 100;
  const total = subtotal + deliveryFee;

  document.getElementById("checkout-subtotal").textContent =
    `R${subtotal.toFixed(2)}`;

  document.getElementById("checkout-delivery").textContent =
    `R${deliveryFee.toFixed(2)}`;

  document.getElementById("checkout-total").textContent =
    `R${total.toFixed(2)}`;
}
// ===============================
// INITIALIZE EVERYTHING
// ===============================

document.addEventListener("DOMContentLoaded", () => {

  // Update badge on every page
  updateCartCount();

  // Add-to-cart buttons
  document.querySelectorAll(".add-to-cart").forEach((button) => {

    button.addEventListener("click", () => {

      const product = {
        id: parseInt(button.dataset.id),
        name: button.dataset.name,
        price: parseFloat(button.dataset.price),
        image: button.dataset.image,
      };

      addToCart(product);
    });
  });

  // Render cart page if we're on /cart
  renderCartPage();

  // Render checkout page if we're on /checkout
  renderCheckoutPage();

  // Clear cart button
  const clearBtn = document.getElementById("clear-cart");

  if (clearBtn) {

    clearBtn.addEventListener("click", () => {

      localStorage.removeItem("cart");

      renderCartPage();
      renderCheckoutPage();
      updateCartCount();
    });
  }
});