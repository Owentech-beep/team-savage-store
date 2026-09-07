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
import {
  generatePayfastSignature,
  getPayfastUrl,
  getPayfastValidateUrl,
} from "./utils/payfast.js";

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
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }),
);
// EJS
app.set("view engine", "ejs");

app.set("trust proxy", 1);

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersToday = orders.filter(
      (order) => new Date(order.createdAt) >= today,
    ).length;

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
  const success = req.query.success === "true";

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

      // =====================================
      // BUILD SIZE STOCK FOR CLOTHING
      // =====================================

      let sizes = [];

      if (req.body.category === "Clothing") {
        sizes = [
          {
            size: "S",
            stock: Math.max(0, Number(req.body.sizeStock_S) || 0),
          },
          {
            size: "M",
            stock: Math.max(0, Number(req.body.sizeStock_M) || 0),
          },
          {
            size: "L",
            stock: Math.max(0, Number(req.body.sizeStock_L) || 0),
          },
          {
            size: "XL",
            stock: Math.max(0, Number(req.body.sizeStock_XL) || 0),
          },
        ];
      }

      // =====================================
      // CREATE PRODUCT
      // =====================================

      await Product.create({
        name: req.body.name,

        price: Number(req.body.price),

        category: req.body.category,

        // =====================================
        // ACCESSORIES USE GENERAL STOCK
        // =====================================
        stock:
          req.body.category === "Accessories"
            ? Math.max(0, Number(req.body.stock) || 0)
            : 0,

        // =====================================
        // CLOTHING USES SIZE STOCK
        // =====================================
        sizes,

        // Cloudinary main image
        image: mainImage.path,

        // Cloudinary gallery images
        gallery: galleryImages.map((file) => file.path),

        description: req.body.description,

        colors: req.body.colors
          ? req.body.colors
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          : [],

        featured: req.body.featured === "true",
      });

      console.log("Product saved with stock successfully");

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

    // =====================================
    // CHECK THAT CART HAS ITEMS
    // =====================================
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty.",
      });
    }

    // =====================================
    // BUILD VERIFIED ORDER ITEMS
    // =====================================
    const verifiedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);

      // Product no longer exists
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `${item.name} is no longer available.`,
        });
      }

      const quantity = Math.max(1, Number(item.quantity) || 1);

      // =====================================
      // CLOTHING — CHECK SELECTED SIZE STOCK
      // =====================================
      if (product.category === "Clothing") {
        if (!item.size) {
          return res.status(400).json({
            success: false,
            message: `Please select a size for ${product.name}.`,
          });
        }

        const selectedSize = product.sizes.find(
          (sizeItem) => sizeItem.size.toLowerCase() === item.size.toLowerCase(),
        );

        if (!selectedSize) {
          return res.status(400).json({
            success: false,
            message: `${item.size} is not available for ${product.name}.`,
          });
        }

        if (selectedSize.stock <= 0) {
          return res.status(400).json({
            success: false,
            message: `${product.name} in size ${selectedSize.size} is out of stock.`,
          });
        }

        if (quantity > selectedSize.stock) {
          return res.status(400).json({
            success: false,
            message: `Sorry, only ${selectedSize.stock} ${product.name} item(s) in size ${selectedSize.size} are available.`,
          });
        }
      }

      // =====================================
      // ACCESSORIES — CHECK NORMAL STOCK
      // =====================================
      else {
        if (product.stock <= 0) {
          return res.status(400).json({
            success: false,
            message: `${product.name} is out of stock.`,
          });
        }

        if (quantity > product.stock) {
          return res.status(400).json({
            success: false,
            message: `Sorry, only ${product.stock} ${product.name} item(s) are available.`,
          });
        }
      }

      // =====================================
      // USE REAL PRODUCT PRICE FROM DATABASE
      // =====================================
      const realPrice = Number(product.price);

      subtotal += realPrice * quantity;

      verifiedItems.push({
        productId: product._id,

        name: product.name,

        price: realPrice,

        quantity,

        size: item.size || "",

        color: item.color || "",
      });
    }

    // =====================================
    // CALCULATE TOTALS ON SERVER
    // =====================================
    const deliveryFee = subtotal > 0 ? 100 : 0;

    const total = subtotal + deliveryFee;

    // =====================================
    // CREATE EFT ORDER
    // =====================================
    const order = await Order.create({
      customerName: req.body.customerName,

      customerEmail: req.body.customerEmail,

      customerPhone: req.body.customerPhone,

      address: req.body.address,

      items: verifiedItems,

      subtotal,

      deliveryFee,

      total,

      paymentMethod: "EFT",

      paymentStatus: "Pending",

      status: "Pending",
    });

    console.log("EFT Order saved:", order._id);

    // =====================================
    // NOTIFY ADMIN ABOUT NEW EFT ORDER
    // =====================================
    try {
      await sendAdminOrderNotification(order);

      console.log("Admin notification email sent for order:", order._id);
    } catch (emailError) {
      console.error("Error sending admin notification email:", emailError);
    }

    // =====================================
    // SEND SUCCESS RESPONSE
    // =====================================
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

    // =====================================
    // ONLY ALLOW EFT PAYMENTS
    // =====================================

    if (order.paymentMethod !== "EFT") {
      return res
        .status(400)
        .send("Only EFT payments can be manually confirmed.");
    }

    // =====================================
    // PREVENT STOCK FROM BEING DEDUCTED TWICE
    // =====================================

    if (order.paymentStatus === "Paid") {
      return res.redirect("/admin");
    }

    // =====================================
    // CHECK STOCK AGAIN BEFORE CONFIRMING
    // =====================================

    for (const item of order.items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(400).send(`Product "${item.name}" no longer exists.`);
      }

      // =====================================
      // CLOTHING — CHECK SELECTED SIZE STOCK
      // =====================================

      if (product.category === "Clothing") {
        const selectedSize = product.sizes.find(
          (sizeItem) => sizeItem.size === item.size,
        );

        // Size no longer exists
        if (!selectedSize) {
          return res
            .status(400)
            .send(
              `Size "${item.size}" is no longer available for "${product.name}".`,
            );
        }

        // Not enough stock for selected size
        if (selectedSize.stock < Number(item.quantity)) {
          return res
            .status(400)
            .send(
              `Cannot confirm payment. Only ${selectedSize.stock} "${product.name}" item(s) in size ${item.size} left in stock.`,
            );
        }
      }

      // =====================================
      // ACCESSORIES — CHECK NORMAL STOCK
      // =====================================
      else {
        if (product.stock < Number(item.quantity)) {
          return res
            .status(400)
            .send(
              `Cannot confirm payment. Only ${product.stock} "${product.name}" item(s) left in stock.`,
            );
        }
      }
    }

    // =====================================
    // REDUCE PRODUCT STOCK
    // =====================================

    for (const item of order.items) {
      const product = await Product.findById(item.productId);

      // =====================================
      // CLOTHING — REDUCE SELECTED SIZE STOCK
      // =====================================

      if (product.category === "Clothing") {
        const selectedSize = product.sizes.find(
          (sizeItem) => sizeItem.size === item.size,
        );

        selectedSize.stock -= Number(item.quantity);
      }

      // =====================================
      // ACCESSORIES — REDUCE NORMAL STOCK
      // =====================================
      else {
        product.stock -= Number(item.quantity);
      }

      await product.save();
    }

    // =====================================
    // CONFIRM PAYMENT
    // =====================================

    order.paymentStatus = "Paid";

    await order.save();

    console.log(`EFT PAYMENT CONFIRMED — Order ${order._id}`);

    // =====================================
    // SEND CUSTOMER PAYMENT CONFIRMATION
    // =====================================

    console.log("About to send customer payment confirmation email...");

    try {
      await sendOrderConfirmation(order);

      console.log("Customer payment confirmation email sent.");
    } catch (emailError) {
      console.error("Error sending customer confirmation email:", emailError);
    }

    // =====================================
    // REDIRECT BACK TO ADMIN
    // =====================================

    res.redirect("/admin");
  } catch (error) {
    console.error("Error confirming EFT payment:", error);

    res.status(500).send("Unable to confirm payment");
  }
});

// =====================================
// PAYFAST SOURCE IP VALIDATION
// =====================================

function ipv4ToNumber(ip) {
  const parts = ip.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255
    )
  ) {
    return null;
  }

  return (
    (((parts[0] << 24) >>> 0) +
      ((parts[1] << 16) >>> 0) +
      ((parts[2] << 8) >>> 0) +
      parts[3]) >>> 0
  );
}

function isIpInCidr(ip, cidr) {
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }

  const [network, prefixLengthString] =
    cidr.split("/");

  const prefixLength =
    Number(prefixLengthString);

  const ipNumber = ipv4ToNumber(ip);
  const networkNumber = ipv4ToNumber(network);

  if (
    ipNumber === null ||
    networkNumber === null ||
    !Number.isInteger(prefixLength) ||
    prefixLength < 0 ||
    prefixLength > 32
  ) {
    return false;
  }

  const mask =
    prefixLength === 0
      ? 0
      : (0xffffffff << (32 - prefixLength)) >>> 0;

  return (
    (ipNumber & mask) ===
    (networkNumber & mask)
  );
}

function isPayfastIp(ip) {
  const payfastIps = [
    "197.97.145.144/28",
    "41.74.179.192/27",
    "102.216.36.0/28",
    "102.216.36.128/28",
    "144.126.193.139/32",
  ];

  return payfastIps.some((cidr) =>
    isIpInCidr(ip, cidr)
  );
}

// =====================================
// CREATE PAYFAST ORDER
// =====================================

app.post("/api/payfast/create", async (req, res) => {
  try {

    const { customerName, customerEmail, customerPhone, address, items } =
      req.body;

    // =====================================
    // CHECK CART
    // =====================================

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty.",
      });
    }

    // =====================================
    // VERIFY PRODUCTS + STOCK
    // =====================================

    const verifiedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `${item.name} is no longer available.`,
        });
      }

      const quantity = Math.max(1, Number(item.quantity) || 1);

      // =====================================
      // CLOTHING — CHECK SIZE STOCK
      // =====================================

      if (product.category === "Clothing") {
        if (!item.size) {
          return res.status(400).json({
            success: false,
            message: `Please select a size for ${product.name}.`,
          });
        }

        const selectedSize = product.sizes.find(
          (sizeItem) => sizeItem.size.toLowerCase() === item.size.toLowerCase(),
        );

        if (!selectedSize) {
          return res.status(400).json({
            success: false,
            message: `${item.size} is not available for ${product.name}.`,
          });
        }

        if (selectedSize.stock <= 0) {
          return res.status(400).json({
            success: false,
            message: `${product.name} in size ${selectedSize.size} is out of stock.`,
          });
        }

        if (quantity > selectedSize.stock) {
          return res.status(400).json({
            success: false,
            message: `Sorry, only ${selectedSize.stock} ${product.name} item(s) are available.`,
          });
        }
      }

      // =====================================
      // ACCESSORIES — CHECK NORMAL STOCK
      // =====================================
      else {
        if (product.stock <= 0) {
          return res.status(400).json({
            success: false,
            message: `${product.name} is out of stock.`,
          });
        }

        if (quantity > product.stock) {
          return res.status(400).json({
            success: false,
            message: `Sorry, only ${product.stock} ${product.name} item(s) are available.`,
          });
        }
      }

      // =====================================
      // USE REAL DATABASE PRICE
      // =====================================

      const realPrice = Number(product.price);

      subtotal += realPrice * quantity;

      verifiedItems.push({
        productId: product._id,
        name: product.name,
        price: realPrice,
        quantity,
        size: item.size || "",
        color: item.color || "",
      });
    }

    // =====================================
    // CURRENT DELIVERY FEE
    // =====================================

    const deliveryFee = subtotal > 0 ? 100 : 0;

    const total = subtotal + deliveryFee;

    // =====================================
    // CREATE PENDING PAYFAST ORDER
    // =====================================

    const order = await Order.create({
      customerName,
      customerEmail,
      customerPhone,
      address,
      items: verifiedItems,
      subtotal,
      deliveryFee,
      total,

      paymentMethod: "Payfast",
      paymentStatus: "Pending",

      status: "Pending",
    });

    console.log("Payfast order created:", order._id);

    // =====================================
    // PAYFAST PAYMENT DATA
    // =====================================

    const baseUrl = process.env.BASE_URL || "https://teamsavage.online";

    const payfastData = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,

      return_url: `${baseUrl}/order-success/${order._id}`,

      cancel_url: `${baseUrl}/checkout?payment=cancelled`,

      notify_url: `${baseUrl}/api/payfast/itn`,

      name_first: customerName.split(" ")[0],

      name_last:
        customerName.split(" ").slice(1).join(" ") ||
        customerName.split(" ")[0],

      email_address: customerEmail,

      cell_number: customerPhone,

      m_payment_id: order._id.toString(),

      amount: Number(total).toFixed(2),

      item_name: `TEAM SAVAGE Order #${order._id
        .toString()
        .slice(-6)
        .toUpperCase()}`,
    };

    // =====================================
    // GENERATE PAYFAST SIGNATURE
    // =====================================

    payfastData.signature = generatePayfastSignature(payfastData);

    // =====================================
    // SEND PAYFAST DETAILS TO CHECKOUT
    // =====================================

    res.status(201).json({
      success: true,
      orderId: order._id,
      payfastUrl: getPayfastUrl(),
      payfastData,
    });
  } catch (error) {
    console.error("Error creating Payfast order:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create Payfast order.",
    });
  }
});

// =====================================
// PAYFAST ITN — PRODUCTION READY
// =====================================

app.post(
  "/api/payfast/itn",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    let session;

    try {
      console.log("=====================================");
      console.log("PAYFAST ITN RECEIVED");
      console.log("=====================================");

      const paymentData = {
        ...req.body,
      };

      // =====================================
      // VERIFY PAYFAST SOURCE IP
      // =====================================

      const sourceIp = req.ip;

      console.log(
        "Payfast ITN source IP:",
        sourceIp
      );

      if (!isPayfastIp(sourceIp)) {
        console.error(
          "Rejected Payfast ITN from unauthorized IP:",
          sourceIp
        );

        return res.status(403).send("Forbidden");
      }

      console.log(
        "Payfast source IP verified."
      );

      // =====================================
      // BASIC PAYMENT ID CHECK
      // =====================================

      if (!paymentData.m_payment_id) {
        console.error(
          "Payfast ITN missing payment ID."
        );

        return res.status(400).send("Bad Request");
      }

      // =====================================
      // FIND ORDER
      // =====================================

      const order =
        await Order.findById(
          paymentData.m_payment_id
        );

      if (!order) {
        console.error(
          "Payfast order not found:",
          paymentData.m_payment_id
        );

        return res.status(404).send("Order not found");
      }

      // =====================================
      // VERIFY PAYMENT METHOD
      // =====================================

      if (
        order.paymentMethod !== "Payfast"
      ) {
        console.error(
          `Order ${order._id} is not a Payfast order.`
        );

        return res.status(400).send("Invalid payment method");
      }

      // =====================================
      // DUPLICATE PAYMENT PROTECTION
      // =====================================

      if (
        order.paymentStatus === "Paid"
      ) {
        console.log(
          `Order ${order._id} is already Paid.`
        );

        return res.status(200).send("OK");
      }

      // =====================================
      // VERIFY PAYMENT STATUS
      // =====================================

      if (
        paymentData.payment_status !==
        "COMPLETE"
      ) {
        console.log(
          "Payfast payment is not complete:",
          paymentData.payment_status
        );

        return res.status(200).send("OK");
      }

      // =====================================
      // VERIFY MERCHANT ID
      // =====================================

      if (
        paymentData.merchant_id !==
        process.env.PAYFAST_MERCHANT_ID
      ) {
        console.error(
          "Payfast merchant ID mismatch."
        );

        return res.status(400).send(
          "Invalid merchant"
        );
      }

      console.log(
        "Payfast merchant ID verified."
      );

      // =====================================
      // VERIFY SIGNATURE
      // =====================================

      const receivedSignature =
        paymentData.signature;

      const calculatedSignature =
        generatePayfastSignature(
          paymentData
        );

      if (
        !receivedSignature ||
        receivedSignature !==
          calculatedSignature
      ) {
        console.error(
          "Payfast ITN signature validation failed."
        );

        return res.status(400).send(
          "Invalid signature"
        );
      }

      console.log(
        "Payfast signature verified."
      );

      // =====================================
      // VERIFY PAYMENT AMOUNT
      // =====================================

      const receivedAmount =
        Number(
          paymentData.amount_gross
        );

      const orderAmount =
        Number(order.total);

      if (
        !Number.isFinite(
          receivedAmount
        ) ||
        Math.abs(
          receivedAmount -
            orderAmount
        ) > 0.01
      ) {
        console.error(
          "Payfast payment amount mismatch."
        );

        console.error(
          "Expected:",
          orderAmount.toFixed(2)
        );

        console.error(
          "Received:",
          receivedAmount
        );

        return res.status(400).send(
          "Invalid amount"
        );
      }

      console.log(
        "Payfast payment amount verified."
      );

      // =====================================
      // SERVER-SIDE PAYFAST VALIDATION
      // =====================================

      const validationString =
        Object.entries(paymentData)
          .filter(
            ([key, value]) =>
              key !== "signature" &&
              value !== undefined &&
              value !== null &&
              value !== ""
          )
          .map(
            ([key, value]) =>
              `${key}=${encodeURIComponent(
                String(value)
              ).replace(/%20/g, "+")}`
          )
          .join("&");

      const validateResponse =
        await fetch(
          getPayfastValidateUrl(),
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded",
            },

            body: validationString,
          }
        );

      const validationResult =
        (
          await validateResponse.text()
        ).trim();

      if (
        validationResult !==
        "VALID"
      ) {
        console.error(
          "Payfast server validation failed:",
          validationResult
        );

        return res.status(400).send(
          "Payfast validation failed"
        );
      }

      console.log(
        "Payfast server validation successful."
      );

      // =====================================
      // START MONGODB TRANSACTION
      // =====================================

      session =
        await mongoose.startSession();

      session.startTransaction();

      // =====================================
      // RELOAD ORDER INSIDE TRANSACTION
      // =====================================

      const transactionOrder =
        await Order.findById(
          order._id
        ).session(session);

      if (!transactionOrder) {
        throw new Error(
          "Order disappeared before transaction."
        );
      }

      // =====================================
      // DUPLICATE PROTECTION INSIDE TRANSACTION
      // =====================================

      if (
        transactionOrder.paymentStatus ===
        "Paid"
      ) {
        await session.commitTransaction();
        session.endSession();

        console.log(
          `Order ${transactionOrder._id} was already paid.`
        );

        return res.status(200).send("OK");
      }

      // =====================================
      // REDUCE STOCK ATOMICALLY
      // =====================================

      for (
        const item of
        transactionOrder.items
      ) {
        const quantity =
          Number(item.quantity);

        if (
          !Number.isInteger(quantity) ||
          quantity <= 0
        ) {
          throw new Error(
            `Invalid quantity for ${item.name}.`
          );
        }

        // =====================================
        // CLOTHING
        // =====================================

        if (
          item.size &&
          item.size.trim() !== ""
        ) {
          const updatedProduct =
            await Product.findOneAndUpdate(
              {
                _id: item.productId,

                sizes: {
                  $elemMatch: {
                    size: item.size,
                    stock: {
                      $gte: quantity,
                    },
                  },
                },
              },
              {
                $inc: {
                  "sizes.$.stock":
                    -quantity,
                },
              },
              {
                new: true,
                session,
              }
            );

          if (!updatedProduct) {
            throw new Error(
              `Not enough stock for ${item.name} size ${item.size}.`
            );
          }
        }

        // =====================================
        // ACCESSORIES
        // =====================================

        else {
          const updatedProduct =
            await Product.findOneAndUpdate(
              {
                _id: item.productId,
                stock: {
                  $gte: quantity,
                },
              },
              {
                $inc: {
                  stock: -quantity,
                },
              },
              {
                new: true,
                session,
              }
            );

          if (!updatedProduct) {
            throw new Error(
              `Not enough stock for ${item.name}.`
            );
          }
        }
      }

      // =====================================
      // MARK ORDER AS PAID
      // =====================================

      transactionOrder.paymentStatus =
        "Paid";

      // IMPORTANT:
      // Fulfilment status stays Pending.
      transactionOrder.status =
        "Pending";

      await transactionOrder.save({
        session,
      });

      // =====================================
      // COMMIT TRANSACTION
      // =====================================

      await session.commitTransaction();
      session.endSession();

      session = null;

      console.log(
        `PAYFAST PAYMENT CONFIRMED — Order ${transactionOrder._id}`
      );

      // =====================================
      // CUSTOMER CONFIRMATION EMAIL
      // =====================================

      try {
        await sendOrderConfirmation(
          transactionOrder
        );

        console.log(
          "Payfast customer confirmation email sent."
        );
      } catch (emailError) {
        console.error(
          "Payfast customer email error:",
          emailError
        );
      }

      // =====================================
      // ADMIN NOTIFICATION
      // =====================================

      try {
        await sendAdminOrderNotification(
          transactionOrder
        );

        console.log(
          "Payfast admin notification email sent."
        );
      } catch (emailError) {
        console.error(
          "Payfast admin email error:",
          emailError
        );
      }

      // =====================================
      // SUCCESS
      // =====================================

      return res.status(200).send("OK");

    } catch (error) {

      console.error(
        "Payfast ITN error:",
        error
      );

      // =====================================
      // ROLLBACK TRANSACTION
      // =====================================

      if (session) {
        try {
          await session.abortTransaction();
        } catch (abortError) {
          console.error(
            "Payfast transaction rollback error:",
            abortError
          );
        }

        session.endSession();
      }

      return res.status(500).send(
        "Internal Server Error"
      );
    }
  }
);

app.post("/admin/update-stock/:id", isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // =====================================
    // CLOTHING — UPDATE INDIVIDUAL SIZE STOCK
    // =====================================
    if (product.category === "Clothing") {
      const sizes = req.body.sizes || [];

      product.sizes = sizes.map((sizeItem) => ({
        size: sizeItem.size,
        stock: Math.max(0, Number(sizeItem.stock) || 0),
      }));
    }

    // =====================================
    // ACCESSORIES — UPDATE NORMAL STOCK
    // =====================================
    else {
      product.stock = Math.max(0, Number(req.body.stock) || 0);
    }

    await product.save();

    console.log(`Stock updated for product: ${product.name}`);

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

// ===============================
// LOGIN PAGE
// ===============================

app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

// ===============================
// LOGIN HANDLER
// ===============================

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  throw new Error(
    "ADMIN_EMAIL or ADMIN_PASSWORD is missing from the environment variables.",
  );
}

// Create password hash when server starts
const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

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
