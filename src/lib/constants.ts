export const ADMIN_ROLES = [
  "super_admin",
  "admin",
  "order_manager",
  "product_manager",
  "inventory_manager",
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  order_manager: "Order Manager",
  product_manager: "Product Manager",
  inventory_manager: "Inventory Manager",
};

export const PRODUCT_STATUSES = ["active", "draft", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_RECORD_STATUSES = ["pending", "completed", "failed", "refunded"] as const;
export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUSES)[number];

export const PAYMENT_METHODS = ["cod", "card", "paypal", "bank_transfer", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const NOTIFICATION_TYPES = [
  "new_order",
  "new_customer",
  "low_stock",
  "out_of_stock",
  "payment_update",
  "order_status",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ADMIN_NOTIFICATION_TYPES = [
  "new_order",
  "new_customer",
  "low_stock",
  "out_of_stock",
  "payment_update",
  "order_status",
  "general",
  "system",
] as const;
export type AdminNotificationType = (typeof ADMIN_NOTIFICATION_TYPES)[number];

export const STOCK_LOG_TYPES = ["increase", "decrease", "adjustment", "sale", "return"] as const;
export type StockLogType = (typeof STOCK_LOG_TYPES)[number];

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "admin_session";
export const SESSION_MAX_AGE_SECONDS = Number(process.env.SESSION_MAX_AGE_SECONDS || 60 * 60 * 24 * 7);

export const DEFAULT_PAGE_SIZE = 10;
