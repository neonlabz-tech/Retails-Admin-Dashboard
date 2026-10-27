import { Notification } from "@/models/Notification";
import { Settings } from "@/models/Settings";
import { Admin } from "@/models/Admin";
import { sendEmail, emailTemplates, type NewOrderEmailData } from "@/lib/email";
import type { NotificationType } from "@/lib/constants";

export async function createNotification(input: {
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  link?: string;
}) {
  return Notification.create(input);
}

export async function getStoreSettings() {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  } else if (settings.currency === "USD" && settings.currencySymbol === "$") {
    settings.currency = "LKR";
    settings.currencySymbol = "LKR";
    await settings.save();
  }
  return settings;
}

/**
 * Resolves active admin email addresses to receive store notifications.
 * Prioritizes storeEmail from Settings (if configured and valid),
 * any active admin accounts from the database, and env overrides.
 */
export async function getAdminNotificationEmails(): Promise<string[]> {
  const emails = new Set<string>();

  // 1. Settings storeEmail
  try {
    const settings = await getStoreSettings();
    if (
      settings.storeEmail &&
      settings.storeEmail.includes("@") &&
      !settings.storeEmail.endsWith("@example.com")
    ) {
      emails.add(settings.storeEmail.trim().toLowerCase());
    }
  } catch (err) {
    console.error("Failed to load store settings for admin email:", err);
  }

  // 2. Query active admins from DB
  try {
    const adminDocs = await Admin.find({
      isActive: { $ne: false },
      role: { $in: ["super_admin", "admin", "order_manager"] },
    })
      .select("email")
      .lean();

    for (const a of adminDocs) {
      if (a.email && a.email.includes("@") && !a.email.endsWith("@example.com")) {
        emails.add(a.email.trim().toLowerCase());
      }
    }
  } catch (err) {
    console.error("Failed to query admin emails:", err);
  }

  // 3. Env var overrides
  const envEmail = process.env.ADMIN_ORDER_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL;
  if (envEmail && envEmail.includes("@") && !envEmail.endsWith("@example.com")) {
    emails.add(envEmail.trim().toLowerCase());
  }

  // Fallback if no real email found: use whatever storeEmail is configured
  if (emails.size === 0) {
    const settings = await getStoreSettings();
    if (settings.storeEmail && settings.storeEmail.includes("@")) {
      emails.add(settings.storeEmail.trim().toLowerCase());
    }
  }

  return Array.from(emails);
}

export async function notifyLowStock(product: { _id: unknown; name: string; stock: number }) {
  await createNotification({
    type: product.stock <= 0 ? "out_of_stock" : "low_stock",
    title: product.stock <= 0 ? "Product out of stock" : "Low stock alert",
    message: `${product.name} ${product.stock <= 0 ? "is now out of stock" : `has only ${product.stock} unit(s) left`}.`,
    relatedId: String(product._id),
    relatedType: "product",
    link: "/dashboard/stock",
  });

  const settings = await getStoreSettings();
  if (settings.emailSettings?.lowStockAlerts) {
    const adminEmails = await getAdminNotificationEmails();
    if (adminEmails.length > 0) {
      await sendEmail({
        to: adminEmails.length === 1 ? adminEmails[0] : adminEmails,
        subject: product.stock <= 0 ? `Out of stock: ${product.name}` : `Low stock alert: ${product.name}`,
        html: emailTemplates.lowStockAlert([{ name: product.name, stock: product.stock }]),
      });
    }
  }
}

export interface NewOrderNotificationDetails {
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

export async function notifyNewOrder(
  orderNumberOrDetails: string | NewOrderNotificationDetails,
  totalParam?: string
) {
  let orderNumber: string;
  let totalStr: string;
  let details: NewOrderEmailData;

  if (typeof orderNumberOrDetails === "object") {
    const d = orderNumberOrDetails;
    orderNumber = d.orderNumber;
    totalStr =
      typeof d.total === "number"
        ? `LKR ${d.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        : String(d.total);
    details = {
      orderNumber: d.orderNumber,
      total: totalStr,
      subtotal: d.subtotal,
      discount: d.discount,
      shippingFee: d.shippingFee,
      paymentMethod: d.paymentMethod,
      customerSnapshot: d.customerSnapshot,
      shippingAddress: d.shippingAddress,
      items: d.items,
      notes: d.notes,
      createdAt: d.createdAt,
    };
  } else {
    orderNumber = orderNumberOrDetails;
    totalStr = totalParam || "LKR 0";
    details = { orderNumber, total: totalStr };
  }

  const cleanOrderNumber = orderNumber.replace(/^#/, "");

  await createNotification({
    type: "new_order",
    title: "New order received",
    message: `Order #${cleanOrderNumber} was placed for ${totalStr}.`,
    relatedType: "order",
    link: `/dashboard/orders?search=${cleanOrderNumber}`,
  });

  const settings = await getStoreSettings();
  if (settings.emailSettings?.newOrderAlerts !== false) {
    const adminEmails = await getAdminNotificationEmails();
    if (adminEmails.length > 0) {
      await sendEmail({
        to: adminEmails.length === 1 ? adminEmails[0] : adminEmails,
        subject: `🔔 New Order Received: #${cleanOrderNumber} (${totalStr})`,
        html: emailTemplates.newOrderAlert(details),
      });
    }
  }
}

export async function notifyNewCustomer(name: string, email: string) {
  await createNotification({
    type: "new_customer",
    title: "New customer registered",
    message: `${name} (${email}) just created an account.`,
    relatedType: "customer",
    link: "/dashboard/customers",
  });

  const settings = await getStoreSettings();
  if (settings.emailSettings?.newCustomerAlerts && settings.storeEmail) {
    await sendEmail({
      to: settings.storeEmail,
      subject: "New customer registered",
      html: emailTemplates.newCustomerAlert(name, email),
    });
  }
}

<<<<<<< Updated upstream
export async function notifyOrderStatusChange(orderNumber: string, status: string, customerEmail: string, customerName: string) {
=======
export interface OrderStatusDetails {
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

export async function notifyOrderStatusChange(
  orderNumber: string,
  status: string,
  customerEmail?: string,
  customerName?: string,
  orderId?: string,
  details?: OrderStatusDetails
) {
  const cleanOrderNumber = orderNumber.replace(/^#/, "");
>>>>>>> Stashed changes
  await createNotification({
    type: "order_status",
    title: "Order status updated",
    message: `Order ${orderNumber} status changed to ${status}.`,
    relatedType: "order",
    link: `/dashboard/orders?search=${cleanOrderNumber}`,
  });

  const settings = await getStoreSettings();
  if (settings.emailSettings?.orderStatusUpdates && customerEmail) {
    const isShipped = status.toLowerCase() === "shipped";
    const isDelivered = status.toLowerCase() === "delivered";
    const subject = isShipped
      ? `Your Order #${cleanOrderNumber} Has Shipped! 🚚`
      : isDelivered
      ? `Your Order #${cleanOrderNumber} Has Been Delivered! 📦`
      : `Order #${cleanOrderNumber} Status: ${status.toUpperCase()}`;

    await sendEmail({
      to: customerEmail,
<<<<<<< Updated upstream
      subject: `Order ${orderNumber} status update`,
      html: emailTemplates.orderStatusUpdate(orderNumber, status, customerName),
=======
      subject,
      html: emailTemplates.orderStatusUpdate({
        orderNumber: cleanOrderNumber,
        status,
        customerName: customerName || "Customer",
        subtotal: details?.subtotal,
        shippingFee: details?.shippingFee,
        discount: details?.discount,
        total: details?.total,
        paymentMethod: details?.paymentMethod,
        shippingAddress: details?.shippingAddress,
        customerSnapshot: details?.customerSnapshot,
        note: details?.note,
        items: details?.items,
      }),
>>>>>>> Stashed changes
    });
  }
}

export async function notifyPaymentUpdate(orderNumber: string, status: string) {
  await createNotification({
    type: "payment_update",
    title: "Payment status updated",
    message: `Payment for order ${orderNumber} is now ${status}.`,
    relatedType: "payment",
    link: "/dashboard/payments",
  });
}
