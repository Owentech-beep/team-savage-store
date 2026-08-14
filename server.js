import express from "express";
import { products } from "./data/products.js";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import Product from "./models/Product.js";
import Order from "./models/Order.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

try {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log("🔥 MongoDB connected successfully");

} catch (error) {
  console.error("❌ MongoDB connection error:", error);

  process.exit(1);
}

app.use(express.urlencoded({ extended: true }));
// Static files
app.use(express.static("public"));

// EJS
app.set("view engine", "ejs");

// Routes
app.get("/", async (req, res) => {
  try {
    const products = await Product.find().limit(4);

    res.render("index", { products });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading home page");
  }
});

app.get("/shop", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    res.render("shop", { products });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading products");
  }
});

app.get("/clothing", async (req, res) => {
  const products = await Product.find({
    category: { $regex: /^clothing$/i }
  });

  res.render("clothing", { products });
});

app.get("/accessories", async (req, res) => {
  const products = await Product.find({
    category: { $regex: /^accessories$/i }
  });

  res.render("accessories", { products });
});

app.get("/product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    res.render("product-details", { product });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading product");
  }
});

app.get("/cart", (req, res) => {
  res.render("cart");
});


// ===============================
// ADMIN DASHBOARD
// ===============================
app.get("/admin", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    const orders = await Order.find().sort({ createdAt: -1 });

    // Start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count orders placed today
    const ordersToday = orders.filter(
      order => new Date(order.createdAt) >= today
    ).length;

    // Calculate total revenue
    const revenue = orders.reduce(
      (sum, order) => sum + order.total,
      0
    );

    res.render("admin", {
      products,
      orders,
      ordersToday,
      revenue,
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading admin dashboard");
  }
});
// ===============================
// UPDATE ORDER STATUS
// ===============================
app.post("/admin/orders/:id/status", async (req, res) => {
  try {

    await Order.findByIdAndUpdate(req.params.id, {
      status: req.body.status,
    });

    console.log(`🔥 Order updated to ${req.body.status}`);

    res.redirect("/admin");

  } catch (error) {
    console.error(error);

    res.status(500).send("Error updating order status");
  }
});

app.get("/admin", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    const orders = await Order.find().sort({ createdAt: -1 });

    res.render("admin", {
      products,
      orders,
    });

  } catch (error) {
    console.error(error);

    res.status(500).send("Error loading admin dashboard");
  }
});

app.get("/order-success/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("order-success", { order });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading confirmation page");
  }
});

app.get("/checkout", (req, res) => {
  res.render("checkout");
});


app.get("/about", (req, res) => {
  res.render("about");
});

// DYNAMIC CATEGORY PAGE
app.get("/category/:name", async (req, res) => {
  try {
    const categoryName = req.params.name;

    const filteredProducts = await Product.find({
      category: { $regex: new RegExp(`^${categoryName}$`, "i") }
    });

    res.render("category", {
      category: categoryName,
      products: filteredProducts,
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading category");
  }
});

app.get("/contact", (req, res) => {
  res.render("contact");
});

app.post("/contact", async (req, res) => {
  const { firstName, lastName, email, subject, message } = req.body;

  console.log({
    firstName,
    lastName,
    email,
    subject,
    message,
  });

  res.redirect("/contact");
});

app.post("/admin/add-product", async (req, res) => {
  try {
    await Product.create({
      name: req.body.name,
      price: Number(req.body.price),
      category: req.body.category,
      image: req.body.image,
      description: req.body.description,
    });

    console.log("🔥 Product saved to MongoDB");

    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving product");
  }
});

app.post("/api/orders", express.json(), async (req, res) => {
  try {
    const order = await Order.create(req.body);

    console.log("🔥 Order saved:", order._id);

    res.status(201).json({
      success: true,
      orderId: order._id,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Error saving order",
    });
  }
});

app.post("/admin/delete-product/:id", async (req, res) => {
  try {

    await Product.findByIdAndDelete(req.params.id);

    console.log("🗑️ Product deleted");

    res.redirect("/admin");

  } catch (error) {
    console.error(error);

    res.status(500).send("Error deleting product");
  }
});

app.post("/api/orders", express.json(), async (req, res) => {
  try {
    const order = await Order.create(req.body);

    console.log("🔥 Order saved:", order._id);

    res.status(201).json({
      success: true,
      orderId: order._id,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Error saving order",
    });
  }
});

app.listen(port, () => {
  console.log(`🔥 TEAM SAVAGE running on http://localhost:${port}`);
});