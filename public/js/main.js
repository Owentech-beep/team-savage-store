async function startCheckout() {
  const form = document.getElementById("checkout-form");

  // =====================================
  // VALIDATE CHECKOUT FORM
  // =====================================

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // =====================================
  // GET CART
  // =====================================

  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  // =====================================
  // GET CUSTOMER INFORMATION
  // =====================================

  const formData = new FormData(form);

  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");

  const email = formData.get("email");
  const phone = formData.get("phone");

  const street = formData.get("address");
  const city = formData.get("city");
  const province = formData.get("province");
  const postalCode = formData.get("postalCode");

  // =====================================
  // CALCULATE TOTALS
  // =====================================

  const subtotal = cart.reduce((sum, item) => {
    return sum + Number(item.price) * Number(item.quantity);
  }, 0);

  const deliveryFee = 100;

  const total = subtotal + deliveryFee;

  // =====================================
  // CREATE ORDER DATA
  // =====================================

  const orderData = {
    customerName: `${firstName} ${lastName}`,

    customerEmail: email,

    customerPhone: phone,

    address: {
      street,
      city,
      province,
      postalCode,
    },

    // =====================================
    // ORDER ITEMS
    // =====================================

    items: cart.map((item) => ({
      // Product MongoDB ID
      productId: item.id,

      name: item.name,

      price: Number(item.price),

      quantity: Number(item.quantity),

      // Important for clothing stock
      size: item.size || "",

      color: item.color || "",
    })),

    subtotal,

    deliveryFee,

    total,

    // =====================================
    // PAYMENT
    // =====================================

    paymentMethod: "EFT",

    paymentStatus: "Pending",
  };

  // =====================================
  // CREATE ORDER
  // =====================================

  try {
    const response = await fetch("/api/orders", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(orderData),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      alert(result.message || "Unable to create order.");
      return;
    }

    // =====================================
    // ORDER SUCCESS
    // =====================================

    localStorage.removeItem("cart");

    // Go to EFT payment page
    window.location.href = `/eft-payment/${result.orderId}`;

  } catch (error) {
    console.error("Checkout error:", error);

    alert("Something went wrong while creating your order.");
  }
}