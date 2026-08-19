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
      `Email sent successfully to ${to}`
    );

    return data;

  } catch (error) {

    console.error(
      "Email failed:",
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
          `TEAM SAVAGE Order Confirmation #${order._id
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
      `Order confirmation sent to ${order.customerEmail}`
    );

    return data;

  } catch (error) {

    console.error(
      "Order confirmation email failed:",
      error
    );

    throw error;

  }
}

export async function sendAdminOrderNotification(order) {

  try {

    const orderNumber = order._id
      .toString()
      .slice(-6)
      .toUpperCase();

    const address = order.address || {};

    const itemsHtml = (order.items || [])
      .map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">
            ${item.name || "Product"}
          </td>

          <td style="padding: 10px; border-bottom: 1px solid #ddd;">
            ${item.size || "-"}
          </td>

          <td style="padding: 10px; border-bottom: 1px solid #ddd;">
            ${item.color || "-"}
          </td>

          <td style="padding: 10px; border-bottom: 1px solid #ddd;">
            ${item.quantity || 1}
          </td>

          <td style="padding: 10px; border-bottom: 1px solid #ddd;">
            R${Number(item.price || 0).toFixed(2)}
          </td>
        </tr>
      `)
      .join("");

    const { data, error } =
      await resend.emails.send({

        from: "TEAM SAVAGE <info@teamsavage.online>",

        to: [process.env.EMAIL_USER],

        subject:
          `🔥 NEW PAID ORDER #${orderNumber}`,

        html: `

          <div style="
            font-family: Arial, sans-serif;
            max-width: 700px;
            margin: auto;
            padding: 20px;
          ">

            <h2 style="color: #f0ad00;">
              🔥 TEAM SAVAGE
            </h2>

            <h1>
              New Paid Order
            </h1>

            <p>
              An EFT order has been confirmed and paid.
            </p>

            <hr>

            <h2>👤 Customer Details</h2>

            <p>
              <strong>Name:</strong>
              ${order.customerName || "-"}
            </p>

            <p>
              <strong>Email:</strong>
              ${order.customerEmail || "-"}
            </p>

            <p>
              <strong>Phone:</strong>
              ${order.customerPhone || "-"}
            </p>

            <hr>

            <h2>📍 Delivery Address</h2>

            <p>
              <strong>Street:</strong>
              ${address.street || "-"}
            </p>

            <p>
              <strong>City:</strong>
              ${address.city || "-"}
            </p>

            <p>
              <strong>Province:</strong>
              ${address.province || "-"}
            </p>

            <p>
              <strong>Postal Code:</strong>
              ${address.postalCode || "-"}
            </p>

            <hr>

            <h2>🛍️ Order Details</h2>

            <p>
              <strong>Order Number:</strong>
              #${orderNumber}
            </p>

            <p>
              <strong>Payment Method:</strong>
              ${order.paymentMethod || "EFT"}
            </p>

            <p>
              <strong>Payment Status:</strong>
              ${order.paymentStatus || "Paid"}
            </p>

            <p>
              <strong>Order Status:</strong>
              ${order.status || "Pending"}
            </p>

            <table style="
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            ">

              <thead>

                <tr style="background: #f8f9fa;">

                  <th style="padding: 10px; text-align: left;">
                    Product
                  </th>

                  <th style="padding: 10px; text-align: left;">
                    Size
                  </th>

                  <th style="padding: 10px; text-align: left;">
                    Color
                  </th>

                  <th style="padding: 10px; text-align: left;">
                    Qty
                  </th>

                  <th style="padding: 10px; text-align: left;">
                    Price
                  </th>

                </tr>

              </thead>

              <tbody>
                ${itemsHtml}
              </tbody>

            </table>

            <hr>

            <h2>💰 Payment Summary</h2>

            <p>
              <strong>Subtotal:</strong>
              R${Number(order.subtotal || 0).toFixed(2)}
            </p>

            <p>
              <strong>Delivery Fee:</strong>
              R${Number(order.deliveryFee || 0).toFixed(2)}
            </p>

            <p style="font-size: 20px;">
              <strong>Total:</strong>
              R${Number(order.total || 0).toFixed(2)}
            </p>

            <hr>

            <p>
              <strong>TEAM SAVAGE Admin Notification</strong>
            </p>

          </div>

        `,

      });

    if (error) {
      throw new Error(error.message);
    }

    console.log(
      ` Admin order notification sent for Order ${orderNumber}`
    );

    return data;

  } catch (error) {

    console.error(
      " Admin order notification failed:",
      error
    );

    throw error;

  }
}