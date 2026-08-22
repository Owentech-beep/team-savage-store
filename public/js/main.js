async function startCheckout() {
  const form = document.getElementById("checkout-form");

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  // ---------------------------------
  // Customer information
  // ---------------------------------

  const formData = new FormData(form);

  const firstName = formData.get("firstName");

  const lastName = formData.get("lastName");

  const email = formData.get("email");

  const phone = formData.get("phone");

  const street = formData.get("address");

  const city = formData.get("city");

  const province = formData.get("province");

  const postalCode = formData.get("postalCode");

  // ---------------------------------
  // Calculate totals
  // ---------------------------------

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0,
  );

  const deliveryFee = 100;

  const total = subtotal + deliveryFee;

  // ---------------------------------
  // Create EFT order
  // ---------------------------------

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

    items: cart.map((item) => ({
      productId: item.productId || item._id || item.id || "",

      name: item.name,

      price: Number(item.price),

      quantity: Number(item.quantity),

      size: item.size || "",

      color: item.color || "",
    })),

    subtotal,

    deliveryFee,

    total,

    // EFT ONLY
    paymentMethod: "EFT",

    paymentStatus: "Pending",
  };

  // ---------------------------------
  // Save order
  // ---------------------------------

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

    // ---------------------------------
    // Order created successfully
    // ---------------------------------

    localStorage.removeItem("cart");

    window.location.href = `/eft-payment/${result.orderId}`;
  } catch (error) {
    console.error(" Checkout error:", error);

    alert("Something went wrong while creating your order.");
  }
}
