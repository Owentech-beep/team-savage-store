import express from "express";
import { products } from "./data/products.js";
import mongoose from "mongoose";
import Product from "./models/Product.js";
import Order from "./models/Order.js";
import { sendEmail } from "./utils/mailer.js";
import multer from "multer";
import path from "path";
import { sendOrderConfirmation } from "./utils/mailer.js";
import session from "express-session";
import bcrypt from "bcrypt";
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

// ===============================
// MULTER CONFIG
// ===============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },

  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

app.use(session({
  secret: "team-savage-secret-key",
  resave: false,
  saveUninitialized: false,
}));

// Static files
app.use(express.static("public"));

// EJS
app.set("view engine", "ejs");

function isAdmin(req, res, next) {
  if (req.session.isAdmin) {
    return next();
  }

  res.redirect("/login");
}

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

    // 🔥 Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).send("Invalid product ID");
    }

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
app.get("/admin", isAdmin , async(req, res) => {
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
app.post("/admin/orders/:id/status", isAdmin , async(req, res) => {
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

app.get("/admin", isAdmin, async (req, res) => {
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
  const {
    firstName,
    lastName,
    email,
    subject,
    message
  } = req.body;

  console.log({
    firstName,
    lastName,
    email,
    subject,
    message,
  });

  try {

    await sendEmail({

      // Your TEAM SAVAGE email
      to: process.env.EMAIL_USER,

      // Customer's email
      replyTo: email,

      // Email subject
      subject: `TEAM SAVAGE Enquiry: ${subject}`,

      // Email content
      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          padding: 20px;
        ">

          <h2 style="color: #f0ad00;">
            🔥 New TEAM SAVAGE Customer Enquiry
          </h2>

          <hr>

          <p>
            <strong>Customer Name:</strong><br>
            ${firstName} ${lastName}
          </p>

          <p>
            <strong>Customer Email:</strong><br>
            ${email}
          </p>

          <p>
            <strong>Subject:</strong><br>
            ${subject}
          </p>

          <hr>

          <h3>Customer Message</h3>

          <div style="
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
          ">
            <p>
              ${message}
            </p>
          </div>

          <hr>

          <p style="color: #777; font-size: 14px;">
            This message was sent from the
            TEAM SAVAGE website.
          </p>

        </div>
      `,
    });

    console.log("📧 Customer enquiry email sent!");

    res.redirect("/contact");

  } catch (error) {

    console.error(
      "❌ Failed to send enquiry email:",
      error
    );

    res.status(500).send(
      "Failed to send enquiry email."
    );
  }
});

app.post(
  "/admin/add-product",
  isAdmin,
  upload.fields([
  { name: "image", maxCount: 1 },
  { name: "gallery", maxCount: 3 },
]),
  async (req, res) => {
    try {
            await Product.create({
        name: req.body.name,
        price: Number(req.body.price),
        category: req.body.category,

        image: `/uploads/${req.files.image[0].filename}`,

        gallery: req.files.gallery
          ? req.files.gallery.map(
              file => `/uploads/${file.filename}`
            )
          : [],

        description: req.body.description,

        colors: req.body.colors
          ? req.body.colors.split(",").map(c => c.trim())
          : [],

        sizes: req.body.sizes
          ? req.body.sizes.split(",").map(s => s.trim())
          : [],

        featured: req.body.featured === "true",
      });

      console.log("🔥 Product saved with image upload");

      res.redirect("/admin");

    } catch (error) {
      console.error(error);

      res.status(500).send("Error saving product");
    }
  }
);

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

app.post("/admin/delete-product/:id", isAdmin, async (req, res) => {
  try {

    await Product.findByIdAndDelete(req.params.id);

    console.log("🗑️ Product deleted");

    res.redirect("/admin");

  } catch (error) {
    console.error(error);

    res.status(500).send("Error deleting product");
  }
});

// ==========================================
// RESET TEAM SAVAGE STORE
// ==========================================

app.post("/admin/reset-store", isAdmin, async (req, res) => {
  try {

    // Delete all products
    await Product.deleteMany({});

    // Delete all customer orders
    await Order.deleteMany({});

    console.log("🔥 TEAM SAVAGE store has been completely reset");

    res.redirect("/admin");

  } catch (error) {

    console.error("❌ Error resetting store:", error);

    res.status(500).send("Error resetting store");

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

// ===============================
// LOGIN PAGE
// ===============================
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

// ===============================
// LOGIN HANDLER
// ===============================
const adminEmail = "teamsavage.online@gmail.com";

// Create a hashed password once
const adminPasswordHash = await bcrypt.hash("Meathotmail789", 10);

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const validPassword = await bcrypt.compare(
    password,
    adminPasswordHash
  );

  if (email === adminEmail && validPassword) {

    req.session.isAdmin = true;

    return res.redirect("/admin");
  }

  res.render("login", {
    error: "Invalid email or password",
  });
});

// ===============================
// LOGOUT
// ===============================
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.listen(port, () => {
  console.log(`🔥 TEAM SAVAGE running on http://localhost:${port}`);
});