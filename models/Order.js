import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({

  // Customer
  customerName: String,
  customerEmail: String,
  customerPhone: String,

  // Delivery address
  address: {
    street: String,
    city: String,
    province: String,
    postalCode: String,
  },

  // Products
  items: [
    {
      productId: String,
      name: String,
      price: Number,
      quantity: Number,
      size: String,
      color: String,
    },
  ],

  // Money
  subtotal: Number,
  deliveryFee: Number,
  total: Number,

  // Payment
  paymentMethod: {
    type: String,
    default: "EFT",
  },

  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Failed"],
    default: "Pending",
  },

  // Order status
  status: {
    type: String,
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered"
    ],
    default: "Pending",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

});

export default mongoose.model("Order", orderSchema);