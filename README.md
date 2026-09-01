# 🦁 TEAM SAVAGE Store

> **Built Different. Train Different.**

TEAM SAVAGE is a full-stack e-commerce website built for a fitness apparel and accessories brand.

The store allows customers to browse products, view product details, select clothing sizes and colours, add accessories directly to their cart, and place orders using EFT.

The project also includes a secure admin dashboard for managing products, stock, orders, and product images.

---

## 🚀 Live Website

🌐 **TEAM SAVAGE:**  
https://teamsavage.online

---

## 📸 Project Overview

TEAM SAVAGE combines a modern fitness-focused design with a full backend e-commerce system.

### Customer Features

- 🛍️ Browse fitness clothing and accessories
- 👕 Clothing size selection
- 🎨 Colour selection
- 🛒 Shopping cart
- 💰 South African Rand (ZAR) pricing
- 🚚 R100 delivery fee
- 📦 Stock availability
- 💳 EFT checkout
- 📧 Order confirmation emails
- 📱 Responsive design
- 💬 WhatsApp customer support

### Admin Features

- 🔐 Secure admin login
- ➕ Add products
- 🖼️ Upload product images
- ✂️ Crop product images before upload
- 🖼️ Upload multiple gallery images
- ⭐ Mark products as featured
- 👕 Manage clothing stock by size
- 📦 Manage accessory stock
- 📋 View customer orders
- 💳 Confirm EFT payments
- 🚚 Update order status
- 🗑️ Delete products
- 📊 View store statistics

---

# 🛠️ Technologies Used

## Frontend

- HTML5
- CSS3
- JavaScript
- Bootstrap 5
- EJS
- Font Awesome
- Cropper.js

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose

## Services & Tools

- Cloudinary — image storage
- Resend — transactional email
- Express Session — admin authentication
- Multer — file uploads
- Git
- GitHub
- Render

---

# 🏗️ Project Structure

```text
team-savage-store/
│
├── models/
│   ├── Order.js
│   └── Product.js
│
├── public/
│   ├── css/
│   ├── images/
│   ├── js/
│   └── uploads/
│
├── utils/
│   └── mailer.js
│
├── views/
│   ├── partials/
│   │   ├── header.ejs
│   │   ├── navbar.ejs
│   │   └── footer.ejs
│   │
│   ├── admin.ejs
│   ├── checkout.ejs
│   ├── contact.ejs
│   ├── index.ejs
│   ├── login.ejs
│   ├── product-details.ejs
│   └── shop.ejs
│
├── .env
├── .gitignore
├── package.json
├── package-lock.json
└── server.js
