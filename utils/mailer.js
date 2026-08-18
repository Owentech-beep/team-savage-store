import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
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

    const { data, error } =
      await resend.emails.send({

        from: "TEAM SAVAGE <info@teamsavage.online>",

        to: [to],

        subject,

        html,

        ...(replyTo ? { replyTo } : {}),

      });

    if (error) {
      throw new Error(error.message);
    }

    console.log(
      `📧 Email sent successfully to ${to}`
    );

    return data;

  } catch (error) {

    console.error(
      "❌ Email failed:",
      error
    );

    throw error;

  }
}
// =====================================
// ORDER CONFIRMATION EMAIL
// =====================================

export async function sendOrderConfirmation(order) {

  try {

    const { data, error } =
      await resend.emails.send({

        from: "TEAM SAVAGE <info@teamsavage.online>",

        to: [order.customerEmail],

        subject:
          `🔥 TEAM SAVAGE Order Confirmation #${order._id
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
              R${Number(order.total || 0).toFixed(2)}
            </p>

            <hr>

            <h3>
              Thank you for shopping with TEAM SAVAGE! 💪🔥
            </h3>

          </div>

        `,

      });

    if (error) {
      throw new Error(error.message);
    }

    console.log(
      `📧 Order confirmation sent to ${order.customerEmail}`
    );

    return data;

  } catch (error) {

    console.error(
      "❌ Order confirmation email failed:",
      error
    );

    throw error;

  }
}