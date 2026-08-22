import express from "express";
import { products } from "./data/products.js";
import mongoose from "mongoose";
import Product from "./models/Product.js";
import Order from "./models/Order.js";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";
import {
  sendOrderConfirmation,
  sendAdminOrderNotification,
  sendEmail,
} from "./utils/mailer.js";
import session from "express-session";
import bcrypt from "bcrypt";

const app = express();
const port = process.env.PORT || 3000;

try {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log("MongoDB connected successfully");
} catch (error) {
  console.error("MongoDB connection error:", error);

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
    const products = await Product.find({
      category: { $not: /^accessories$/i },
    })
      .sort({ createdAt: -1 })
      .limit(4);

    res.render("index", { products });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading home page");
  }
});

app.get("/stores", async (req, res) => {
  res.render("stores", {
    search: "",
  });
});

app.get("/shop", async (req, res) => {
  try {
    const products = await Product.find({
      category: { $not: /^accessories$/i },
    }).sort({ createdAt: -1 });

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
    // Check if ID is valid
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
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const oldStatus = order.status;
    const newStatus = req.body.status;

    // Update order status
    order.status = newStatus;

    await order.save();

    console.log(`Order ${order._id} updated: ${oldStatus} → ${newStatus}`);

    // =====================================
    // SEND STATUS EMAIL
    // =====================================

    if (
      oldStatus !== newStatus &&
      ["Processing", "Shipped", "Delivered"].includes(newStatus)
    ) {
      try {
        let subject = "";
        let heading = "";
        let message = "";

        if (newStatus === "Processing") {
          subject = `TEAM SAVAGE Order #${order._id
            .toString()
            .slice(-6)
            .toUpperCase()} — Processing`;

          heading = "Your Order Is Being Processed ";

          message = `
            <p>
              Great news! Your TEAM SAVAGE order is now being processed.
            </p>

            <p>
              We're getting your items ready for you.
            </p>
          `;
        }

        if (newStatus === "Shipped") {
          subject = `TEAM SAVAGE Order #${order._id
            .toString()
            .slice(-6)
            .toUpperCase()} — Shipped`;

          heading = "Your Order Has Shipped 📦";

          message = `
            <p>
              Your TEAM SAVAGE order has been shipped!
            </p>

            <p>
              Your order is now on its way to you.
            </p>
          `;
        }

        if (newStatus === "Delivered") {
          subject = `TEAM SAVAGE Order #${order._id
            .toString()
            .slice(-6)
            .toUpperCase()} — Delivered`;

          heading = "Your Order Has Been Delivered 🎉";

          message = `
            <p>
              Your TEAM SAVAGE order has been delivered.
            </p>

            <p>
              We hope you enjoy your gear!
            </p>

            <p>
              Thank you for shopping with TEAM SAVAGE.
            </p>
          `;
        }

        await sendEmail({
          to: order.customerEmail,

          subject,

          html: `

            <div style="
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: auto;
              padding: 20px;
            ">

              <h2 style="color: #f0ad00;">
                 TEAM SAVAGE
              </h2>

              <h1>
                ${heading}
              </h1>

              <p>
                Hi ${order.customerName || "there"},
              </p>

              ${message}

              <hr>

              <p>
                <strong>Order Number:</strong>
                #${order._id.toString().slice(-6).toUpperCase()}
              </p>

              <p>
                <strong>Order Total:</strong>
                R${Number(order.total || 0).toFixed(2)}
              </p>

              <p>
                <strong>Current Status:</strong>
                ${newStatus}
              </p>

              <hr>

              <p style="color: #777;">
                Thank you for shopping with TEAM SAVAGE.
              </p>

            </div>

          `,
        });

        console.log(` ${newStatus} email sent to ${order.customerEmail}`);
      } catch (emailError) {
        console.error(` Failed to send ${newStatus} email:`, emailError);

        // The order status was already successfully updated.
        // Email failure should not undo the status change.
      }
    }

    res.redirect("/admin");
  } catch (error) {
    console.error(" Error updating order status:", error);

    res.status(500).send("Error updating order status");
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

// ===============================
// TRACK ORDER
// ===============================
app.get("/track-order/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("track-order", {
      order,
    });
  } catch (error) {
    console.error(" Error loading order tracking:", error);

    res.status(500).send("Error loading order tracking");
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
    console.error("Error loading EFT payment page:", error);

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

  const success =
    req.query.success === "true";

  res.render("contact", {
    success,
  });

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
             New TEAM SAVAGE Customer Enquiry
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

    console.log(" Customer enquiry email sent!");

    res.redirect("/contact?success=true");
  } catch (error) {
    console.error(" Failed to send enquiry email:", error);

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

        // Stock quantity
        stock: Math.max(0, Number(req.body.stock) || 0),

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

      console.log("Product saved with Cloudinary images and stock");

      res.redirect("/admin");
    } catch (error) {
      console.error("Error saving product:", error);

      res.status(500).send("Error saving product");
    }
  },
);

// =====================================
// CREATE ORDER — EFT ONLY
// =====================================
app.post("/api/orders", express.json(), async (req, res) => {
  try {
    const items = req.body.items;

    // Check that the order has items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty.",
      });
    }

    // =====================================
    // CHECK REAL STOCK IN MONGODB
    // =====================================
    for (const item of items) {
      const product = await Product.findById(item.productId);

      // Product no longer exists
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `${item.name} is no longer available.`,
        });
      }

      // Product is out of stock
      if (product.stock <= 0) {
        return res.status(400).json({
          success: false,
          message: `${product.name} is out of stock.`,
        });
      }

      // Customer wants more than available
      if (Number(item.quantity) > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Sorry, only ${product.stock} ${product.name} item(s) are available.`,
        });
      }
    }

    // =====================================
    // CREATE ORDER
    // =====================================
    const order = await Order.create({
      customerName: req.body.customerName,

      customerEmail: req.body.customerEmail,

      customerPhone: req.body.customerPhone,

      address: req.body.address,

      city: req.body.city,

      province: req.body.province,

      postalCode: req.body.postalCode,

      items: items,

      subtotal: req.body.subtotal,

      deliveryFee: req.body.deliveryFee,

      total: req.body.total,

      // EFT ONLY
      paymentMethod: "EFT",

      paymentStatus: "Pending",

      status: "Pending",
    });

    console.log("EFT Order saved:", order._id);

    res.status(201).json({
      success: true,
      orderId: order._id,
    });

  } catch (error) {
    console.error("Error saving EFT order:", error);

    res.status(500).json({
      success: false,
      message: "Error saving order",
    });
  }
});

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

    // Prevent stock from being deducted twice
    if (order.paymentStatus === "Paid") {
      return res.redirect("/admin");
    }

    // =====================================
    // CHECK STOCK AGAIN BEFORE CONFIRMING
    // =====================================
    for (const item of order.items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res
          .status(400)
          .send(`Product "${item.name}" no longer exists.`);
      }

      if (product.stock < item.quantity) {
        return res
          .status(400)
          .send(
            `Cannot confirm payment. Only ${product.stock} "${product.name}" item(s) left in stock.`
          );
      }
    }

    // =====================================
    // REDUCE PRODUCT STOCK
    // =====================================
    for (const item of order.items) {
      const product = await Product.findById(item.productId);

      product.stock -= Number(item.quantity);

      await product.save();
    }

    // =====================================
    // CONFIRM PAYMENT
    // =====================================
    order.paymentStatus = "Paid";

    await order.save();

    console.log(`EFT PAYMENT CONFIRMED — Order ${order._id}`);

    // SEND EMAILS
    console.log("About to send EFT confirmation email...");

    await sendOrderConfirmation(order);
    await sendAdminOrderNotification(order);

    console.log("EFT confirmation function finished.");

    // Redirect back to admin
    res.redirect("/admin");

  } catch (error) {
    console.error("Error confirming EFT payment:", error);

    res.status(500).send("Unable to confirm payment");
  }
});

app.post("/admin/update-stock/:id", isAdmin, async (req, res) => {
  try {
    const stock = Math.max(0, Number(req.body.stock) || 0);

    await Product.findByIdAndUpdate(
      req.params.id,
      { stock },
      { runValidators: true }
    );

    res.redirect("/admin");
  } catch (error) {
    console.error("Error updating product stock:", error);
    res.status(500).send("Error updating product stock");
  }
});

app.post("/admin/delete-product/:id", isAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);

    console.log(" Product deleted");

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

    console.log(" TEAM SAVAGE store has been completely reset");

    res.redirect("/admin");
  } catch (error) {
    console.error(" Error resetting store:", error);

    res.status(500).send("Error resetting store");
  }
});

app.post("/api/orders", express.json(), async (req, res) => {
  try {
    const order = await Order.create(req.body);

    console.log(" Order saved:", order._id);

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
  console.log(` TEAM SAVAGE running on http://localhost:${port}`);
});
