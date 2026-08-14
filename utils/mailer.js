import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


// =====================================
// GENERAL EMAIL FUNCTION
// =====================================

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}) {

  try {

    await transporter.sendMail({

      from: `"TEAM SAVAGE" <${process.env.EMAIL_USER}>`,

      to,

      subject,

      html,

      replyTo,

    });

    console.log(`📧 Email sent successfully to ${to}`);

  } catch (error) {

    console.error("❌ Email failed:", error);

    throw error;

  }
}


// =====================================
// ORDER CONFIRMATION EMAIL
// =====================================

export async function sendOrderConfirmation(order) {

  try {

    await transporter.sendMail({

      from: `"TEAM SAVAGE" <${process.env.EMAIL_USER}>`,

      to: order.customerEmail,

      subject: `🔥 TEAM SAVAGE Order Confirmation #${order._id
        .toString()
        .slice(-6)
        .toUpperCase()}`,

      html: `

        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          padding: 20px;
        ">

          <h2 style="color: #f0ad00;">
            🔥 TEAM SAVAGE
          </h2>

          <h1>
            Order Confirmed!
          </h1>

          <p>
            Thank you for your order.
          </p>

          <hr>

          <p>
            <strong>Order Number:</strong>
            #${order._id
              .toString()
              .slice(-6)
              .toUpperCase()}
          </p>

          <p>
            <strong>Status:</strong>
            ${order.status}
          </p>

          <p>
            <strong>Total:</strong>
            R${Number(order.total).toFixed(2)}
          </p>

          <hr>

          <h3>
            Thank you for shopping with TEAM SAVAGE! 💪🔥
          </h3>

        </div>

      `,

    });

    console.log(
      `📧 Order confirmation sent to ${order.customerEmail}`
    );

  } catch (error) {

    console.error(
      "❌ Order confirmation email failed:",
      error
    );

    throw error;

  }
}