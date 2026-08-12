import express from "express";
import { products } from "./data/products.js";
import nodemailer from "nodemailer";


const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
// Static files
app.use(express.static("public"));

// EJS
app.set("view engine", "ejs");

// Routes
app.get("/", (req, res) => {
  res.render("index", {
    products,
  });
});

app.get("/shop", (req, res) => {

  const search = req.query.search || "";

  const filteredProducts = products.filter((product) =>

    product.name.toLowerCase().includes(search.toLowerCase()) ||

    product.category.toLowerCase().includes(search.toLowerCase())
  );

  res.render("shop", {
    products: filteredProducts,
    search,
  });
});

app.get("/clothing", (req, res) => {
  const clothing = products.filter(product =>
    [
      "T-Shirts",
      "Vests",
      "Hoodies",
      "Men's Leggings",
      "Ladies Leggings"
    ].includes(product.category)
  );

  res.render("shop", {
    products: clothing,
  });
});

app.get("/accessories", (req, res) => {
  const accessories = products.filter(product =>
    [
      "Bottles",
      "Tumblers",
      "Bags",
      "Gym Straps"
    ].includes(product.category)
  );

  res.render("shop", {
    products: accessories,
  });
});

app.get("/product/:id", (req, res) => {
  const productId = parseInt(req.params.id);

  const product = products.find(p => p.id === productId);

  if (!product) {
    return res.status(404).send("Product not found");
  }

  res.render("product", {
    product,
  });
});

app.get("/cart", (req, res) => {
  res.render("cart");
});

app.get("/admin", (req, res) => {
  res.render("admin", {
    products,
  });
});

app.get("/checkout", (req, res) => {
  res.render("checkout");
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/category/:name", (req, res) => {

  const categoryName = req.params.name;

  const filteredProducts = products.filter((product) =>
    product.category.toLowerCase() === categoryName.toLowerCase()
  );

  res.render("category", {
    category: categoryName,
    products: filteredProducts,
  });
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

app.listen(port, () => {
  console.log(`🔥 TEAM SAVAGE running on http://localhost:${port}`);
});