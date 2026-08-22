import mongoose from "mongoose";

const productSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
  },

  price: {
    type: Number,
    required: true,
  },

  category: {
    type: String,
    enum: ["Clothing", "Accessories"],
    required: true,
  },

  image: {
    type: String,
    required: true,
  },

  // Additional gallery images
  gallery: [String],

  description: String,

  // Available colours
  colors: [String],

  // Available sizes
  sizes: [String],

  // Product inventory
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },

  featured: {
    type: Boolean,
    default: false,
  },

}, { timestamps: true });

export default mongoose.model("Product", productSchema);