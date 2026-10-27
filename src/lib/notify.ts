import { Notification } from "@/models/Notification";
import { Settings } from "@/models/Settings";
import { sendEmail, emailTemplates } from "@/lib/email";
import type { NotificationType } from "@/lib/constants";

export async function createNotification(input: {
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  link?: string;
}) {
  return Notification.create({
    ...input,
    isRead: false,
    read: false,
  });
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

export async function notifyLowStock(product: { _id: unknown; name: string; stock: number }) {
  const notifType = product.stock <= 0 ? "out_of_stock" : "low_stock";
  const title = product.stock <= 0 ? "Product out of stock" : "Low stock alert";
  const message = `${product.name} ${product.stock <= 0 ? "is now out of stock" : `has only ${product.stock} unit(s) left`}.`;

  const identicalUnread = await Notification.findOne({
    relatedId: String(product._id),
    type: notifType,
    message,
    isRead: false,
  });

  if (!identicalUnread) {
    await createNotification({
      type: notifType,
      title,
      message,
      relatedId: String(product._id),
      relatedType: "product",
      link: "/dashboard/stock",
    });
  }

  const settings = await getStoreSettings();
  if (settings.emailSettings?.lowStockAlerts && settings.storeEmail) {
    await sendEmail({
      to: settings.storeEmail,
      subject: product.stock <= 0 ? `Out of stock: ${product.name}` : `Low stock alert: ${product.name}`,
      html: emailTemplates.lowStockAlert([{ name: product.name, stock: product.stock }]),
    });
  }
}

export async function notifyNewOrder(orderNumber: string, total: string) {
  await createNotification({
    type: "new_order",
    title: "New order received",
    message: `Order ${orderNumber} was placed for ${total}.`,
    relatedType: "order",
    link: "/dashboard/orders",
  });

  const settings = await getStoreSettings();
  if (settings.emailSettings?.newOrderAlerts && settings.storeEmail) {
    await sendEmail({
      to: settings.storeEmail,
      subject: `New order received: ${orderNumber}`,
      html: emailTemplates.newOrderAlert(orderNumber, total),
    });
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

export async function notifyOrderStatusChange(
  orderNumber: string,
  status: string,
  customerEmail?: string,
  customerName?: string,
  orderId?: string
) {
  const cleanOrderNumber = orderNumber.replace(/^#/, "");
  await createNotification({
    type: "order_status",
    title: "Order status updated",
    message: `Order #${cleanOrderNumber} status changed to ${status}.`,
    relatedId: orderId || "",
    relatedType: "order",
    link: "/dashboard/orders",
  });

  const settings = await getStoreSettings();
  if (settings.emailSettings?.orderStatusUpdates && customerEmail) {
    await sendEmail({
      to: customerEmail,
      subject: `Order #${cleanOrderNumber} status update`,
      html: emailTemplates.orderStatusUpdate(cleanOrderNumber, status, customerName || "Customer"),
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
