import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  customerName: String,
  customerEmail: String,

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

  total: Number,

  status: {
    type: String,
    default: "Pending",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Order", orderSchema);