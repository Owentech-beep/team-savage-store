// ===============================
// CART STORAGE
// ===============================

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
    return total + Number(item.quantity);
  }, 0);

  document.querySelectorAll(".cart-count").forEach((badge) => {
    badge.textContent = totalItems;

    // Hide badge if empty
    badge.style.display = totalItems > 0 ? "flex" : "none";
  });
}

// ===============================
// ADD TO CART
// ===============================

function addToCart(product) {
  const cart = getCart();

  // Match same product + same size + same colour
  const existing = cart.find(
    (item) =>
      item.id === product.id &&
      item.size === product.size &&
      item.color === product.color
  );

  if (existing) {
    existing.quantity += product.quantity;
  } else {
    cart.push({
      ...product,
    });
  }

  saveCart(cart);
  updateCartCount();

  alert(`${product.name} added to cart!`);
}

// ===============================
// REMOVE ITEM FROM CART
// ===============================

function removeFromCart(index) {
  const cart = getCart();

  if (index < 0 || index >= cart.length) {
    return;
  }

  cart.splice(index, 1);

  saveCart(cart);

  updateCartCount();
  renderCartPage();
  renderCheckoutPage();
}

// Make remove function available to HTML buttons
window.removeFromCart = removeFromCart;

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
        <i class="fa-solid fa-cart-shopping me-2"></i>
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
    .map((item, index) => {
      const itemTotal =
        Number(item.price) * Number(item.quantity);

      subtotal += itemTotal;

      return `
        <div class="card mb-3 shadow-sm border-0">

          <div class="card-body">

            <div class="d-flex justify-content-between align-items-center gap-3">

              <div class="flex-grow-1">

                <h5 class="mb-1">
                  ${item.name}
                </h5>

                <p class="text-muted mb-0">
                  Size: ${item.size || "N/A"} <br>
                  Colour: ${item.color || "N/A"} <br>
                  Quantity: ${item.quantity}
                </p>

              </div>

              <div class="text-end">

                <div class="fw-bold text-warning mb-2">
                  R${itemTotal.toFixed(2)}
                </div>

                <button
                  type="button"
                  class="btn btn-outline-danger btn-sm"
                  onclick="removeFromCart(${index})"
                  aria-label="Remove ${item.name} from cart"
                  title="Remove item">

                  <i class="fa-solid fa-trash"></i>

                </button>

              </div>

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

  document.getElementById("cart-total").textContent =
    `R${total.toFixed(2)}`;
}

// ===============================
// RENDER CHECKOUT PAGE
// ===============================

function renderCheckoutPage() {
  const container =
    document.getElementById("checkout-items");

  if (!container) return;

  const cart = getCart();

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="alert alert-secondary">
        <i class="fa-solid fa-cart-shopping me-2"></i>
        Your cart is empty.
      </div>
    `;

    document.getElementById("checkout-subtotal").textContent =
      "R0.00";

    document.getElementById("checkout-delivery").textContent =
      "R0.00";

    document.getElementById("checkout-total").textContent =
      "R0.00";

    return;
  }

  let subtotal = 0;

  container.innerHTML = cart
    .map((item) => {
      const itemTotal =
        Number(item.price) * Number(item.quantity);

      subtotal += itemTotal;

      return `
        <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">

          <div>

            <h6 class="mb-1">
              ${item.name}
            </h6>

            <small class="text-muted">
              Qty: ${item.quantity}
            </small>

          </div>

          <span class="fw-semibold">
            R${itemTotal.toFixed(2)}
          </span>

        </div>
      `;
    })
    .join("");

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

      const sizeSelect =
        document.querySelector(".product-size");

      const colorSelect =
        document.querySelector(".product-color");

      const quantityInput =
        document.querySelector(".product-quantity");

      // Require size
      if (sizeSelect && !sizeSelect.value) {
        alert("Please select a size before adding to cart.");
        return;
      }

      // Require colour
      if (colorSelect && !colorSelect.value) {
        alert("Please select a colour before adding to cart.");
        return;
      }

      const product = {

        id: button.dataset.id,

        name: button.dataset.name,

        price: parseFloat(button.dataset.price),

        image: button.dataset.image,

        size: sizeSelect
          ? sizeSelect.value
          : null,

        color: colorSelect
          ? colorSelect.value
          : null,

        quantity: quantityInput
          ? parseInt(quantityInput.value)
          : 1,

      };

      addToCart(product);

    });

  });

  // Render cart page
  renderCartPage();

  // Render checkout page
  renderCheckoutPage();

  // Clear cart button
  const clearBtn =
    document.getElementById("clear-cart");

  if (clearBtn) {

    clearBtn.addEventListener("click", () => {

      localStorage.removeItem("cart");

      renderCartPage();
      renderCheckoutPage();
      updateCartCount();

    });

  }

});

// Make functions available globally
window.updateCartCount = updateCartCount;
window.addToCart = addToCart;
