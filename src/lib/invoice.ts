import { formatCurrency, formatDateTime, formatOrderId } from "./utils";

export interface InvoiceOrderData {
  orderNumber: string;
  customerSnapshot?: {
    name?: string;
    email?: string;
    phone?: string;
  };
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
  billingAddress?: Record<string, string>;
  items: Array<{
    name: string;
    variantName?: string;
    sku?: string;
    price: number;
    quantity: number;
    subtotal?: number;
  }>;
  subtotal: number;
  discount?: number;
  shippingFee?: number;
  tax?: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string | Date;
}

function escapeHtml(str?: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPaymentMethod(method?: string): string {
  if (!method) return "Not specified";
  if (method.toLowerCase() === "cod") return "Cash on Delivery (COD)";
  if (method.toLowerCase() === "credit_card") return "Credit Card";
  if (method.toLowerCase() === "debit_card") return "Debit Card";
  if (method.toLowerCase() === "net_banking") return "Net Banking";
  if (method.toLowerCase() === "upi") return "UPI";
  return method.replace(/_/g, " ").toUpperCase();
}

export function generateInvoiceHtml(order: InvoiceOrderData, storeName = "RKF Retail Store"): string {
  const orderId = formatOrderId(order.orderNumber, order.createdAt);
  const dateStr = formatDateTime(order.createdAt);
  const discountAmount = order.discount || 0;
  const shippingAmount = order.shippingFee !== undefined ? order.shippingFee : 0;
  const taxAmount = order.tax || 0;

  const addressLines: string[] = [];
  if (order.shippingAddress?.line1) addressLines.push(escapeHtml(order.shippingAddress.line1));
  if (order.shippingAddress?.line2) addressLines.push(escapeHtml(order.shippingAddress.line2));
  const cityState = [order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.postalCode]
    .filter(Boolean)
    .join(", ");
  if (cityState) addressLines.push(escapeHtml(cityState));
  if (order.shippingAddress?.country) addressLines.push(escapeHtml(order.shippingAddress.country));

  const itemsHtml = order.items
    .map((item, idx) => {
      const lineTotal = item.subtotal !== undefined ? item.subtotal : item.price * item.quantity;
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
          <td style="padding: 10px 12px; color: #64748b; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px 12px;">
            <div style="font-weight: 600; color: #0f172a;">${escapeHtml(item.name)}</div>
            ${item.variantName ? `<div style="display: inline-block; font-size: 11px; font-weight: 600; color: #4338ca; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 4px; padding: 1px 6px; margin-top: 3px;">Variant: ${escapeHtml(item.variantName)}</div>` : ""}
            ${item.sku ? `<div style="font-size: 11px; font-family: monospace; color: #64748b; margin-top: 2px;">SKU: ${escapeHtml(item.sku)}</div>` : ""}
          </td>
          <td style="padding: 10px 12px; text-align: right; color: #334155;">${escapeHtml(formatCurrency(item.price))}</td>
          <td style="padding: 10px 12px; text-align: center; font-weight: 600; color: #0f172a;">${item.quantity}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #0f172a;">${escapeHtml(formatCurrency(lineTotal))}</td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${escapeHtml(orderId)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      line-height: 1.45;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .badge-paid {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .badge-pending {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .badge-failed {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .badge-status {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
  </style>
</head>
<body>
  <div style="max-width: 800px; margin: 0 auto; padding: 10px 0;">
    
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #093b84;">
      <div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="/images/logo.png" alt="Logo" style="height: 44px; width: auto; object-fit: contain;" onerror="this.style.display='none'" />
          <div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #093b84; letter-spacing: -0.02em;">${escapeHtml(storeName)}</h1>
            <p style="margin: 2px 0 0; font-size: 11px; color: #64748b; font-weight: 500;">Retail &amp; E-Commerce Management</p>
          </div>
        </div>
        <div style="margin-top: 10px; font-size: 11px; color: #475569; line-height: 1.5;">
          <div>Support Email: support@rkfstore.com</div>
          <div>Web: www.rkfstore.com</div>
        </div>
      </div>

      <div style="text-align: right;">
        <div style="font-size: 24px; font-weight: 900; color: #093b84; letter-spacing: 0.05em;">INVOICE</div>
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 3px;"># ${escapeHtml(orderId)}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Date: ${escapeHtml(dateStr)}</div>
        <div style="margin-top: 8px; display: flex; gap: 6px; justify-content: flex-end;">
          <span class="badge ${order.paymentStatus === "paid" ? "badge-paid" : order.paymentStatus === "pending" ? "badge-pending" : "badge-failed"}">
            Payment: ${escapeHtml(order.paymentStatus)}
          </span>
          <span class="badge badge-status">
            Order: ${escapeHtml(order.status)}
          </span>
        </div>
      </div>
    </div>

    <!-- Customer & Shipping Section -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px;">
      <!-- Bill To -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
        <div style="background: #f8fafc; padding: 7px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0;">
          Customer Details
        </div>
        <div style="padding: 10px 12px; font-size: 12px; color: #334155; line-height: 1.5;">
          <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${escapeHtml(order.customerSnapshot?.name || "Customer")}</div>
          <div style="color: #475569; margin-top: 2px;">Email: ${escapeHtml(order.customerSnapshot?.email || "—")}</div>
          <div style="color: #475569;">Phone: ${escapeHtml(order.customerSnapshot?.phone || "—")}</div>
        </div>
      </div>

      <!-- Ship To -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
        <div style="background: #f8fafc; padding: 7px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0;">
          Shipping Address
        </div>
        <div style="padding: 10px 12px; font-size: 12px; color: #334155; line-height: 1.5;">
          <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${escapeHtml(order.shippingAddress?.fullName || order.customerSnapshot?.name || "Recipient")}</div>
          ${addressLines.length > 0 ? addressLines.map((line) => `<div>${line}</div>`).join("") : "<div>Standard Delivery Address</div>"}
          ${order.shippingAddress?.phone ? `<div style="color: #475569; margin-top: 2px;">Phone: ${escapeHtml(order.shippingAddress.phone)}</div>` : ""}
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <div style="margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <table>
        <thead>
          <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.04em;">
            <th style="padding: 9px 12px; width: 40px; text-align: center;">#</th>
            <th style="padding: 9px 12px; text-align: left;">Item Description</th>
            <th style="padding: 9px 12px; width: 110px; text-align: right;">Unit Price</th>
            <th style="padding: 9px 12px; width: 60px; text-align: center;">Qty</th>
            <th style="padding: 9px 12px; width: 120px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <!-- Financial Breakdown & Notes -->
    <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin-top: 18px; align-items: start;">
      <!-- Left: Payment details & notes -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #fafafa; font-size: 12px;">
        <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;">
          Payment Information
        </div>
        <div style="color: #475569; margin-bottom: 3px;">
          <strong>Payment Method:</strong> ${escapeHtml(formatPaymentMethod(order.paymentMethod))}
        </div>
        <div style="color: #475569; margin-bottom: 3px;">
          <strong>Payment Status:</strong> <span style="text-transform: capitalize; font-weight: 600;">${escapeHtml(order.paymentStatus)}</span>
        </div>
        ${
          order.notes
            ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1; color: #64748b; font-size: 11px;">
                <strong>Order Note:</strong> ${escapeHtml(order.notes)}
               </div>`
            : ""
        }
      </div>

      <!-- Right: Subtotals & Grand Total -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #ffffff;">
        <table style="font-size: 12px; width: 100%;">
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Subtotal:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b;">${escapeHtml(formatCurrency(order.subtotal))}</td>
          </tr>
          ${
            discountAmount > 0
              ? `<tr>
                  <td style="padding: 4px 0; color: #059669;">Discount:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #059669;">-${escapeHtml(formatCurrency(discountAmount))}</td>
                </tr>`
              : ""
          }
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Shipping Fee:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b;">${escapeHtml(formatCurrency(shippingAmount))}</td>
          </tr>
          ${
            taxAmount > 0
              ? `<tr>
                  <td style="padding: 4px 0; color: #64748b;">Tax / VAT:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b;">${escapeHtml(formatCurrency(taxAmount))}</td>
                </tr>`
              : ""
          }
          <tr style="border-top: 2px solid #093b84;">
            <td style="padding: 10px 0 4px; font-size: 14px; font-weight: 800; color: #093b84;">Grand Total:</td>
            <td style="padding: 10px 0 4px; text-align: right; font-size: 16px; font-weight: 800; color: #093b84;">
              ${escapeHtml(formatCurrency(order.total))}
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Footer Terms & Disclaimer -->
    <div style="margin-top: 30px; padding-top: 14px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.5;">
      <div style="font-weight: 600; color: #64748b;">Thank you for your business!</div>
      <div>Goods can be exchanged within 7 days of delivery upon presenting this original invoice.</div>
      <div style="margin-top: 4px; font-size: 10px; color: #cbd5e1;">This is a computer-generated document. No physical signature is required.</div>
    </div>

  </div>
</body>
</html>`;
}

export function printInvoice(order: InvoiceOrderData, storeName?: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(generateInvoiceHtml(order, storeName));
  doc.close();

  const print = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  };

  // Wait for resources (such as logo image) to load inside iframe
  if (iframe.contentWindow) {
    if (doc.readyState === "complete") {
      setTimeout(print, 250);
    } else {
      iframe.contentWindow.onload = () => setTimeout(print, 250);
    }
  } else {
    setTimeout(print, 350);
  }
}
