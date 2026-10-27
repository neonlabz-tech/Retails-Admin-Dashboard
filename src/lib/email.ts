import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM || "Admin Dashboard <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<{ sent: boolean; error?: string }> {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not configured. Skipping email to ${to} - "${subject}"`);
    return { sent: false, error: "Email provider not configured" };
  }
  try {
    await resend.emails.send({ from: fromAddress, to, subject, html });
    return { sent: true };
  } catch (err) {
    console.error("[email] Failed to send email:", err);
    return { sent: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(title: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0f172a; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">RKF DISTRIBUTORS</h1>
              <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Official Store</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">${title}</h2>
              <div style="color: #374151; font-size: 14px; line-height: 1.6;">${bodyHtml}</div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0; background-color: #f8fafc;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                RKF Distributors &bull; Jaffna, Sri Lanka &bull; info@rkfdistributors.lk
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} RKF Distributors. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface OrderStatusEmailData {
  orderNumber: string;
  status: string;
  customerName: string;
  subtotal?: number;
  shippingFee?: number;
  discount?: number;
  total?: number;
  paymentMethod?: string;
  shippingAddress?: {
    fullName?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
  };
  customerSnapshot?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  note?: string;
  items?: Array<{ name: string; quantity: number; price: number; color?: string; size?: string }>;
}

export interface NewOrderEmailData {
  orderNumber: string;
  total: string | number;
  subtotal?: number;
  discount?: number;
  shippingFee?: number;
  paymentMethod?: string;
  customerSnapshot?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  shippingAddress?: {
    fullName?: string;
    line1?: string;
    city?: string;
    country?: string;
    phone?: string;
  };
  items?: Array<{ name: string; quantity: number; price: number }>;
  notes?: string;
  createdAt?: Date | string;
}

export const emailTemplates = {
  orderStatusUpdate(
    orderNumberOrData: string | OrderStatusEmailData,
    statusParam?: string,
    customerNameParam?: string
  ): string {
    let orderNumber: string;
    let status: string;
    let customerName: string;
    let subtotal: number | undefined;
    let shippingFee: number | undefined;
    let discount: number | undefined;
    let total: number | undefined;
    let paymentMethod: string | undefined;
    let shippingAddress: OrderStatusEmailData["shippingAddress"];
    let customerSnapshot: OrderStatusEmailData["customerSnapshot"];
    let note: string | undefined;
    let items: Array<{ name: string; quantity: number; price: number; color?: string; size?: string }> | undefined;

    if (typeof orderNumberOrData === "object" && orderNumberOrData !== null) {
      orderNumber = orderNumberOrData.orderNumber;
      status = orderNumberOrData.status;
      customerName = orderNumberOrData.customerName || "Customer";
      subtotal = orderNumberOrData.subtotal;
      shippingFee = orderNumberOrData.shippingFee;
      discount = orderNumberOrData.discount;
      total = orderNumberOrData.total;
      paymentMethod = orderNumberOrData.paymentMethod;
      shippingAddress = orderNumberOrData.shippingAddress;
      customerSnapshot = orderNumberOrData.customerSnapshot;
      note = orderNumberOrData.note;
      items = orderNumberOrData.items;
    } else {
      orderNumber = orderNumberOrData;
      status = statusParam || "updated";
      customerName = customerNameParam || "Customer";
    }

    const cleanOrderNumber = escapeHtml(orderNumber.replace(/^#/, ''));
    const safeCustomer = escapeHtml(customerName || 'Customer');
    const safeStatus = status.toLowerCase().trim();

    const fmt = (val?: number) =>
      `LKR ${Math.round(val ?? 0).toLocaleString("en-US")}`;

    // Status styling configuration
    let badgeBg = "#eff6ff";
    let badgeColor = "#2563eb";
    let statusIcon = "🚚";
    let statusTitle = "Your Order is on the Way! 🚚";
    let statusMessage = `Hello <strong>${safeCustomer}</strong>, great news! Your order <strong>#${cleanOrderNumber}</strong> has been shipped and is on its way to you.`;

    if (safeStatus === "delivered") {
      badgeBg = "#ecfdf5";
      badgeColor = "#059669";
      statusIcon = "📦";
      statusTitle = "Your Order Has Been Delivered! 📦";
      statusMessage = `Hello <strong>${safeCustomer}</strong>, your package for order <strong>#${cleanOrderNumber}</strong> has been successfully delivered! We hope you love your purchase.`;
    } else if (safeStatus === "processing") {
      badgeBg = "#fffbeb";
      badgeColor = "#d97706";
      statusIcon = "⚙️";
      statusTitle = "Order Received &amp; Processing";
      statusMessage = `Hello <strong>${safeCustomer}</strong>, thank you for shopping with us! We have received your order <strong>#${cleanOrderNumber}</strong> and it is currently being prepared for dispatch.`;
    } else if (safeStatus === "confirmed") {
      badgeBg = "#ecfdf5";
      badgeColor = "#059669";
      statusIcon = "✅";
      statusTitle = "Order Confirmed ✅";
      statusMessage = `Hello <strong>${safeCustomer}</strong>, your order <strong>#${cleanOrderNumber}</strong> has been confirmed.`;
    } else if (safeStatus === "out_for_delivery") {
      badgeBg = "#faf5ff";
      badgeColor = "#7e22ce";
      statusIcon = "🛵";
      statusTitle = "Out for Delivery Today 🛵";
      statusMessage = `Hello <strong>${safeCustomer}</strong>, your package for order <strong>#${cleanOrderNumber}</strong> is out for delivery with our courier.`;
    } else if (safeStatus === "cancelled") {
      badgeBg = "#fef2f2";
      badgeColor = "#dc2626";
      statusIcon = "❌";
      statusTitle = "Order Cancelled ❌";
      statusMessage = `Hello <strong>${safeCustomer}</strong>, your order <strong>#${cleanOrderNumber}</strong> has been cancelled. Please contact our support team if you have any questions.`;
    }

    // Items table HTML (placed mail style)
    let itemsHtml = "";
    if (items && items.length > 0) {
      const rows = items
        .map((item) => {
          const itemTotal = fmt(item.price * item.quantity);
          const metaParts: string[] = [];
          if (item.color) metaParts.push(`Color: ${escapeHtml(item.color)}`);
          if (item.size && item.size !== "default") metaParts.push(`Size: ${escapeHtml(item.size)}`);
          const metaText = metaParts.length > 0 ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${metaParts.join(" | ")}</div>` : "";

          return `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: left; vertical-align: top;">
                <strong style="color: #111827; font-size: 14px; font-weight: 600;">${escapeHtml(item.name)}</strong>
                ${metaText}
                <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">Qty: ${item.quantity} × ${fmt(item.price)}</div>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right; vertical-align: top; color: #111827; font-weight: 600; font-size: 14px;">
                ${itemTotal}
              </td>
            </tr>
          `;
        })
        .join("");

      itemsHtml = `
        <!-- Items Table -->
        <tr>
          <td style="padding: 24px 32px 12px 32px;">
            <h3 style="margin: 0 0 16px 0; font-size: 15px; color: #0f172a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Purchased Items</h3>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${rows}
            </table>
          </td>
        </tr>
      `;
    }

    // Pricing Breakdown (placed mail style)
    const calcSubtotal = subtotal ?? 0;
    const calcDiscount = discount ?? 0;
    const calcShipping = shippingFee ?? 0;
    const calcTotal = total !== undefined ? total : Math.max(0, calcSubtotal - calcDiscount + calcShipping);

    const discountRow = calcDiscount > 0
      ? `
        <tr>
          <td style="padding: 6px 0; color: #059669; font-size: 13px;">Discount</td>
          <td style="padding: 6px 0; text-align: right; color: #059669; font-weight: 600; font-size: 13px;">-${fmt(calcDiscount)}</td>
        </tr>
      `
      : "";

    const shippingRow = `
      <tr>
        <td style="padding: 6px 0; color: #2563eb; font-size: 13px; font-weight: 600;">Shipping Fee</td>
        <td style="padding: 6px 0; text-align: right; color: #2563eb; font-weight: 700; font-size: 13px;">
          ${fmt(calcShipping)}
        </td>
      </tr>
    `;

    const pricingBreakdownHtml = `
      <!-- Pricing Breakdown -->
      <tr>
        <td style="padding: 0 32px 24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e2e8f0; padding-top: 12px;">
            <tr>
              <td style="padding: 6px 0; color: #4b5563; font-size: 13px;">Product Total</td>
              <td style="padding: 6px 0; text-align: right; color: #111827; font-weight: 500; font-size: 13px;">${fmt(calcSubtotal)}</td>
            </tr>
            ${discountRow}
            ${shippingRow}
            <tr>
              <td style="padding: 12px 0 0 0; color: #0f172a; font-size: 15px; font-weight: 700; border-top: 2px solid #0f172a;">
                Total Fee (Product Total + Shipping Fee)
              </td>
              <td style="padding: 12px 0 0 0; text-align: right; color: #c96742; font-size: 18px; font-weight: 800; border-top: 2px solid #0f172a;">
                ${fmt(calcTotal)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;

    // Courier note block
    let noteHtml = "";
    if (note && note.trim()) {
      noteHtml = `
        <tr>
          <td style="padding: 16px 32px 0 32px;">
            <div style="padding: 12px 16px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 6px; font-size: 13px; color: #15803d; text-align: left;">
              <strong>Courier / Tracking Note:</strong> ${escapeHtml(note.trim())}
            </div>
          </td>
        </tr>
      `;
    }

    // Review Block for Delivered Orders
    let reviewHtml = "";
    if (safeStatus === "delivered") {
      const siteOrigin = "https://rkfdistributors.lk";
      reviewHtml = `
        <tr>
          <td style="padding: 0 32px 24px 32px;">
            <div style="padding: 24px 20px; background-color: #fff9f6; border: 1px solid #fed7aa; border-radius: 12px; text-align: center;">
              <div style="font-size: 24px; line-height: 1; margin-bottom: 8px;">⭐⭐⭐⭐⭐</div>
              <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 18px; font-weight: 700;">Rate &amp; Review Your Items</h3>
              <p style="margin: 0 0 18px 0; color: #4b5563; font-size: 13px; line-height: 1.5; max-width: 440px; margin-left: auto; margin-right: auto;">
                We hope you love your purchase! Click below to review your items and share your experience with other shoppers.
              </p>
              <div style="margin-top: 14px;">
                <a href="${siteOrigin}/profile" target="_blank" style="display: inline-block; background-color: #c96742; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 3px 6px rgba(201, 103, 66, 0.2);">
                  Leave a Review &rarr;
                </a>
              </div>
            </div>
          </td>
        </tr>
      `;
    }

    // Delivery & Payment Details (if provided)
    let deliveryPaymentHtml = "";
    const hasAddress = Boolean(shippingAddress?.fullName || shippingAddress?.line1 || customerSnapshot?.name);
    const paymentLabel =
      paymentMethod === "cod"
        ? "Cash on Delivery (COD)"
        : paymentMethod === "bank_transfer"
        ? "Bank Transfer"
        : paymentMethod ? escapeHtml(paymentMethod) : "Standard Payment";

    if (hasAddress || paymentMethod || customerSnapshot?.email) {
      deliveryPaymentHtml = `
        <tr>
          <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="vertical-align: top; padding-right: 16px;">
                  <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 13px; font-weight: 700; text-transform: uppercase;">Delivery Address</h4>
                  <p style="margin: 0; font-size: 13px; color: #4b5563; line-height: 1.4;">
                    ${escapeHtml(shippingAddress?.fullName || customerSnapshot?.name || safeCustomer)}<br>
                    ${shippingAddress?.line1 ? `${escapeHtml(shippingAddress.line1)}<br>` : ""}
                    ${shippingAddress?.city ? `${escapeHtml(shippingAddress.city)}${shippingAddress.country ? `, ${escapeHtml(shippingAddress.country)}` : ""}<br>` : ""}
                    ${escapeHtml(shippingAddress?.phone || customerSnapshot?.phone || "")}
                  </p>
                </td>
                <td width="50%" style="vertical-align: top; padding-left: 16px;">
                  <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 13px; font-weight: 700; text-transform: uppercase;">Payment Details</h4>
                  <p style="margin: 0; font-size: 13px; color: #4b5563; line-height: 1.4;">
                    Method: <strong>${paymentLabel}</strong><br>
                    ${customerSnapshot?.email ? `Email: ${escapeHtml(customerSnapshot.email)}` : ""}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusTitle} #${cleanOrderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">

          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background-color: #0f172a; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">RKF DISTRIBUTORS</h1>
              <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Official Store</p>
            </td>
          </tr>

          <!-- Banner -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <div style="display: inline-block; padding: 6px 16px; border-radius: 9999px; background-color: ${badgeBg}; color: ${badgeColor}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                ${statusIcon} Status: ${escapeHtml(status.replace(/_/g, ' '))}
              </div>
              <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px; font-weight: 700;">${statusTitle}</h2>
              <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5;">
                ${statusMessage}
              </p>
            </td>
          </tr>

          <!-- Order Summary Bar -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 13px; color: #64748b;">Order Number: <strong style="color: #0f172a;">#${cleanOrderNumber}</strong></td>
                  <td style="font-size: 13px; color: #64748b; text-align: right;">Status: <strong style="color: #0f172a; text-transform: capitalize;">${escapeHtml(status)}</strong></td>
                </tr>
              </table>
            </td>
          </tr>

          ${noteHtml}

          ${itemsHtml}

          ${pricingBreakdownHtml}

          ${reviewHtml}

          ${deliveryPaymentHtml}

          <!-- Support & Footer -->
          <tr>
            <td style="padding: 28px 32px; text-align: center; border-top: 1px solid #e2e8f0; background-color: #ffffff;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #4b5563;">
                Have a question or need assistance with your order?
              </p>
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #0f172a;">
                Contact us anytime at <a href="mailto:info@rkfdistributors.lk" style="color: #c96742; font-weight: 600; text-decoration: none;">info@rkfdistributors.lk</a> or call <strong>+94 77 123 4567</strong>
              </p>
              <div style="font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                RKF Distributors &bull; Jaffna, Sri Lanka &bull; info@rkfdistributors.lk
                <br>&copy; ${new Date().getFullYear()} RKF Distributors. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  },
  lowStockAlert(products: Array<{ name: string; stock: number }>) {
    const rows = products
      .map((p) => `<li>${p.name} &mdash; ${p.stock} unit(s) left</li>`)
      .join("");
    return layout("Low Stock Alert", `<p>The following products are low on stock:</p><ul>${rows}</ul>`);
  },
  newOrderAlert(orderOrNumber: string | NewOrderEmailData, totalParam?: string) {
    let orderNumber: string;
    let totalStr: string;
    let data: NewOrderEmailData | null = null;

    if (typeof orderOrNumber === "string") {
      orderNumber = orderOrNumber.replace(/^#/, "");
      totalStr = totalParam || "LKR 0";
    } else {
      data = orderOrNumber;
      orderNumber = data.orderNumber.replace(/^#/, "");
      totalStr =
        typeof data.total === "number"
          ? `LKR ${data.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
          : String(data.total);
    }

    const fmt = (n?: number) =>
      typeof n === "number"
        ? `LKR ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        : "";

    const customerName = data?.customerSnapshot?.name || data?.shippingAddress?.fullName || "Customer";
    const customerEmail = data?.customerSnapshot?.email || "";
    const customerPhone = data?.customerSnapshot?.phone || data?.shippingAddress?.phone || "";

    const addressParts = [
      data?.shippingAddress?.line1,
      data?.shippingAddress?.city,
      data?.shippingAddress?.country,
    ].filter(Boolean);
    const addressStr = addressParts.length > 0 ? addressParts.join(", ") : "";

    const paymentLabel =
      data?.paymentMethod === "cod"
        ? "Cash on Delivery (COD)"
        : data?.paymentMethod === "bank_transfer"
        ? "Bank Transfer"
        : data?.paymentMethod || "Standard Payment";

    let itemsHtml = "";
    if (data?.items && data.items.length > 0) {
      const rows = data.items
        .map(
          (item) => `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">
              ${item.name}
              <div style="font-size: 12px; color: #64748b;">Qty: ${item.quantity} &times; ${fmt(item.price)}</div>
            </td>
            <td style="padding: 8px 0; text-align: right; color: #1e293b; font-weight: 600;">
              ${fmt(item.price * item.quantity)}
            </td>
          </tr>`
        )
        .join("");

      itemsHtml = `
      <div style="margin: 18px 0; padding: 14px 18px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h4 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; font-weight: 700;">
          Ordered Items
        </h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          ${rows}
        </table>
      </div>`;
    }

    let customerBlock = "";
    if (customerName || customerEmail || customerPhone || addressStr) {
      customerBlock = `
      <div style="margin: 16px 0; padding: 14px 18px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; line-height: 1.6; color: #334155;">
        <h4 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; font-weight: 700;">
          Customer &amp; Delivery Details
        </h4>
        <div><strong>Name:</strong> ${customerName}</div>
        ${customerEmail ? `<div><strong>Email:</strong> <a href="mailto:${customerEmail}" style="color: #0284c7;">${customerEmail}</a></div>` : ""}
        ${customerPhone ? `<div><strong>Phone:</strong> ${customerPhone}</div>` : ""}
        ${addressStr ? `<div><strong>Shipping Address:</strong> ${addressStr}</div>` : ""}
        <div><strong>Payment Method:</strong> ${paymentLabel}</div>
        ${data?.notes ? `<div style="margin-top: 6px; padding: 6px 10px; background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 12px; color: #92400e;"><strong>Order Note:</strong> ${data.notes}</div>` : ""}
      </div>`;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

    const contentHtml = `
      <div style="margin-bottom: 14px;">
        <p style="font-size: 15px; margin: 0 0 6px 0; color: #0f172a;">
          A new order <strong>#${orderNumber}</strong> has just been placed.
        </p>
        <p style="font-size: 13px; color: #64748b; margin: 0;">
          Total order amount: <strong style="color: #0284c7; font-size: 15px;">${totalStr}</strong>
        </p>
      </div>
      ${customerBlock}
      ${itemsHtml}
      <div style="margin-top: 24px; text-align: left;">
        <a href="${appUrl}/dashboard/orders" style="display: inline-block; background-color: #0284c7; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px;">
          View Order in Dashboard &rarr;
        </a>
      </div>
    `;

    return layout(`New Order Received #${orderNumber}`, contentHtml);
  },
  newCustomerAlert(name: string, email: string) {
    return layout("New Customer Registered", `<p>${name} (${email}) just created an account.</p>`);
  },
  passwordReset(name: string, resetUrl: string): string {
    const safeName = escapeHtml(name || "Admin");
    const safeUrl = escapeHtml(resetUrl);
    return layout(
      "Password Reset Request",
      `
      <tr>
        <td style="padding: 32px 32px 16px; text-align: left;">
          <div style="display: inline-block; padding: 10px 14px; background-color: #eff6ff; border-radius: 10px; margin-bottom: 16px;">
            <span style="font-size: 20px;">🔑</span>
          </div>
          <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #0f172a;">Password Reset Request</h1>
          <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.6;">
            Hello <strong>${safeName}</strong>, we received a request to reset your password for the RKF Admin Dashboard.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 32px; text-align: left;">
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px;">
            <p style="margin: 0 0 16px; font-size: 13px; color: #475569; line-height: 1.6;">
              Click the button below to choose a new password. This link will expire in <strong>1 hour</strong>.
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${safeUrl}" style="display: inline-block; background-color: #093b84; color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(9, 59, 132, 0.2);">
                Reset Password
              </a>
            </div>
            <p style="margin: 16px 0 0; font-size: 11px; color: #94a3b8; word-break: break-all;">
              Or copy and paste this link into your browser:<br/>
              <a href="${safeUrl}" style="color: #093b84;">${safeUrl}</a>
            </p>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 32px 32px; text-align: left;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
            If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </td>
      </tr>
      `
    );
  },
};
