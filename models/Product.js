import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
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

    // =====================================
    // CLOTHING SIZES WITH INDIVIDUAL STOCK
    // =====================================
    sizes: [
      {
        size: {
          type: String,
          required: true,
        },

        stock: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],

    // =====================================
    // GENERAL STOCK FOR ACCESSORIES
    // =====================================
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Product", productSchema);