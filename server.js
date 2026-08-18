import express from "express";
import { products } from "./data/products.js";
import mongoose from "mongoose";
import Product from "./models/Product.js";
import Order from "./models/Order.js";
import multer from "multer";
import {
  generatePayfastSignature,
  generatePayfastITNSignature,
} from "./utils/payfast.js";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";
import {
  sendOrderConfirmation,
  sendEmail
} from "./utils/mailer.js";
import session from "express-session";
import bcrypt from "bcrypt";

const app = express();
const port = process.env.PORT || 3000;

try {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log("🔥 MongoDB connected successfully");
} catch (error) {
  console.error("❌ MongoDB connection error:", error);

  process.exit(1);
}

// ===============================
// CLOUDINARY CONFIG
// ===============================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ===============================
// CLOUDINARY MULTER STORAGE
// ===============================

const storage = new CloudinaryStorage({
  cloudinary,

  params: {
    folder: "team-savage-products",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({
  storage,
});

// Static files
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "team-savage-secret-key",
    resave: false,
    saveUninitialized: false,
  }),
);
// EJS
app.set("view engine", "ejs");

function isAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
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
    category: { $regex: /^clothing$/i },
  });

  res.render("clothing", { products });
});

app.get("/accessories", async (req, res) => {
  const products = await Product.find({
    category: { $regex: /^accessories$/i },
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
app.get("/admin", isAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    const orders = await Order.find().sort({ createdAt: -1 });

    // Start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count orders placed today
    const ordersToday = orders.filter(
      (order) => new Date(order.createdAt) >= today,
    ).length;

    // Calculate total revenue
    const revenue = orders.reduce((sum, order) => sum + order.total, 0);

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
app.post("/admin/orders/:id/status", isAdmin, async (req, res) => {
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

app.get("/eft-payment/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("eft-payment", {
      order,
    });
  } catch (error) {
    console.error("❌ Error loading EFT payment page:", error);

    res.status(500).send("Error loading EFT payment page");
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
      category: { $regex: new RegExp(`^${categoryName}$`, "i") },
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
    console.error("❌ Failed to send enquiry email:", error);

    res.status(500).send("Failed to send enquiry email.");
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
      const mainImage = req.files?.image?.[0];

      if (!mainImage) {
        return res.status(400).send("Main product image is required.");
      }

      const galleryImages = req.files?.gallery || [];

      await Product.create({
        name: req.body.name,

        price: Number(req.body.price),

        category: req.body.category,

        // Cloudinary URL
        image: mainImage.path,

        // Cloudinary gallery URLs
        gallery: galleryImages.map((file) => file.path),

        description: req.body.description,

        colors: req.body.colors
          ? req.body.colors
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          : [],

        sizes: req.body.sizes
          ? req.body.sizes
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],

        featured: req.body.featured === "true",
      });

      console.log("🔥 Product saved with Cloudinary images");

      res.redirect("/admin");
    } catch (error) {
      console.error("❌ Error saving product:", error);

      res.status(500).send("Error saving product");
    }
  },
);

app.post("/api/orders", express.json(), async (req, res) => {
  try {
    const order = await Order.create({
      customerName: req.body.customerName,

      customerEmail: req.body.customerEmail,

      customerPhone: req.body.customerPhone,

      address: req.body.address,

      city: req.body.city,

      province: req.body.province,

      postalCode: req.body.postalCode,

      items: req.body.items,

      subtotal: req.body.subtotal,

      deliveryFee: req.body.deliveryFee,

      total: req.body.total,

      paymentMethod: req.body.paymentMethod,

      paymentStatus: "Pending",

      status: "Pending",
    });

    console.log("🔥 Order saved:", order._id);

    app.post("/api/payfast/create", async (req, res) => {
      try {
        const { orderId } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
          return res.status(404).json({
            success: false,
            message: "Order not found",
          });
        }

        const paymentData = {
          merchant_id: process.env.PAYFAST_MERCHANT_ID,

          merchant_key: process.env.PAYFAST_MERCHANT_KEY,

          return_url: `${process.env.BASE_URL}/order-success/${order._id}`,

          cancel_url: `${process.env.BASE_URL}/checkout`,

          notify_url: `${process.env.BASE_URL}/api/payfast/notify`,

          name_first: order.customerName?.split(" ")[0] || "Customer",

          name_last: order.customerName?.split(" ").slice(1).join(" ") || "",

          email_address: order.customerEmail,

          m_payment_id: order._id.toString(),

          amount: Number(order.total).toFixed(2),

          item_name: `TEAM SAVAGE Order ${order._id.toString().slice(-6)}`,
        };

        paymentData.signature = generatePayfastSignature(paymentData);

        res.json({
          success: true,
          paymentData,
          payfastUrl: process.env.PAYFAST_URL,
        });
      } catch (error) {
        console.error("❌ PayFast creation error:", error);

        res.status(500).json({
          success: false,
          message: "Unable to create PayFast payment",
        });
      }
    });

    res.status(201).json({
      success: true,

      orderId: order._id,
    });
  } catch (error) {
    console.error("❌ Error saving order:", error);

    res.status(500).json({
      success: false,

      message: "Error saving order",
    });
  }
});

// =====================================
// PAYFAST ITN / PAYMENT NOTIFICATION
// =====================================

app.post(
  "/api/payfast/notify",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    try {
      console.log("🔥 PayFast ITN received");

      const data = req.body;

      // ---------------------------------
      // 1. Basic validation
      // ---------------------------------

      if (!data.m_payment_id) {
        console.error("❌ Missing payment ID");
        return res.status(400).send("Missing payment ID");
      }

      if (!data.signature) {
        console.error("❌ Missing PayFast signature");
        return res.status(400).send("Missing signature");
      }

      // ---------------------------------
      // 2. Verify PayFast signature
      // ---------------------------------

      const receivedSignature = data.signature;

      const expectedSignature = generatePayfastITNSignature(data);

      if (receivedSignature.toLowerCase() !== expectedSignature.toLowerCase()) {
        console.error("❌ Invalid PayFast signature");

        console.error("Received:", receivedSignature);
        console.error("Expected:", expectedSignature);

        return res.status(400).send("Invalid signature");
      }

      console.log("✅ PayFast signature verified");

      // ---------------------------------
      // 3. Verify merchant ID
      // ---------------------------------

      if (
        String(data.merchant_id) !== String(process.env.PAYFAST_MERCHANT_ID)
      ) {
        console.error("❌ Invalid merchant ID");

        return res.status(400).send("Invalid merchant ID");
      }

      console.log("✅ Merchant ID verified");

      // ---------------------------------
      // 4. Find the order
      // ---------------------------------

      const order = await Order.findById(data.m_payment_id);

      if (!order) {
        console.error("❌ Order not found:", data.m_payment_id);

        return res.status(404).send("Order not found");
      }

      // ---------------------------------
      // 5. Verify payment amount
      // ---------------------------------

      const payfastAmount = Number(data.amount_gross);

      const orderAmount = Number(order.total);

      if (!Number.isFinite(payfastAmount) || !Number.isFinite(orderAmount)) {
        console.error("❌ Invalid payment amount");

        return res.status(400).send("Invalid amount");
      }

      if (Math.abs(payfastAmount - orderAmount) > 0.01) {
        console.error("❌ Payment amount mismatch", {
          payfastAmount,
          orderAmount,
        });

        return res.status(400).send("Payment amount mismatch");
      }

      console.log("✅ Payment amount verified");

      // ---------------------------------
      // 6. Check payment status
      // ---------------------------------

      if (data.payment_status !== "COMPLETE") {
        console.log(`⚠️ PayFast payment status: ${data.payment_status}`);

        return res.status(200).send("OK");
      }

      // ---------------------------------
      // 7. Prevent duplicate processing
      // ---------------------------------

      if (order.paymentStatus === "Paid") {
        console.log(`ℹ️ Order ${order._id} is already paid`);

        return res.status(200).send("OK");
      }

      // ---------------------------------
      // 8. Mark order as paid
      // ---------------------------------

      order.paymentStatus = "Paid";
      order.paymentMethod = "PayFast";

      await order.save();

      console.log(`💰 PAYMENT PAID — Order ${order._id}`);

      await sendOrderConfirmation(order);

      res.status(200).send("OK");
    } catch (error) {
      console.error("❌ PayFast ITN error:", error);

      res.status(500).send("ITN processing failed");
    }
  },
);

app.post("/admin/orders/:id/payment", isAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Only allow manual payment confirmation for EFT
    if (order.paymentMethod !== "EFT") {
      return res
        .status(400)
        .send("Only EFT payments can be manually confirmed.");
    }

    order.paymentStatus = "Paid";

    await order.save();

    console.log(`💰 EFT PAYMENT CONFIRMED — Order ${order._id}`);

    // 📧 TEMPORARY EMAIL DEBUGGING
    console.log("📧 About to send EFT confirmation email...");

    await sendOrderConfirmation(order);

    console.log("📧 EFT confirmation function finished.");

    // Redirect back to admin
    res.redirect("/admin");
  } catch (error) {
    console.error("❌ Error confirming EFT payment:", error);

    res.status(500).send("Unable to confirm payment");
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

  const validPassword = await bcrypt.compare(password, adminPasswordHash);

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
