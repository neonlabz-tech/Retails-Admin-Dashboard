import { z } from "zod";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, PAYMENT_RECORD_STATUSES, STOCK_LOG_TYPES, ADMIN_ROLES } from "./constants";

export const loginSchema = z.object({
  email: z.string().email("A valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const subcategorySchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, "Subcategory name is required"),
  slug: z.string().optional(),
  description: z.string().optional().default(""),
});

export const categorySchema = z.object({
  name: z.string().min(2, "Category name is required"),
  description: z.string().optional().default(""),
  image: z.string().trim().min(1, "Category image is required"),
  isActive: z.boolean().optional().default(true),
  subcategories: z
    .array(
      z.union([
        z.string().min(1),
        subcategorySchema,
      ])
    )
    .optional()
    .default([]),
});

export const specificationSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

export const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  description: z.string().optional().default(""),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().trim().optional().default(""),
  price: z.coerce.number({ message: "Price is required" }).min(0, "Price must be a positive number"),
  salePrice: z.coerce.number().min(0).optional().nullable(),
  sku: z.string().trim().min(1, "SKU / Product code is required"),
  images: z.array(z.string()).optional().default([]),
  specifications: z.array(specificationSchema).optional().default([]),
  stock: z.coerce.number({ message: "Stock quantity is required" }).min(0, "Stock quantity must be 0 or more"),
  lowStockThreshold: z.coerce.number({ message: "Low alert threshold is required" }).min(0, "Low alert threshold must be 0 or more"),
  status: z.enum(["active", "draft", "archived"] as const, { message: "Status is required" }),
  isFeatured: z.boolean().optional().default(false),
});

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  note: z.string().optional(),
  shippingFee: z.coerce.number().min(0).optional(),
});

export const paymentStatusSchema = z.object({
  status: z.enum(PAYMENT_RECORD_STATUSES),
  transactionId: z.string().optional(),
});

export const stockAdjustSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(STOCK_LOG_TYPES),
  quantity: z.coerce.number().int(),
  reason: z.string().optional().default(""),
});

export const customerStatusSchema = z.object({
  isActive: z.boolean(),
});

export const settingsSchema = z.object({
  storeName: z.string().min(1),
  storeEmail: z.string().email().optional().or(z.literal("")),
  storePhone: z.string().optional().default(""),
  storeAddress: z.string().optional().default(""),
  storeLogo: z.string().optional().default(""),
  currency: z.string().optional().default("LKR"),
  currencySymbol: z.string().optional().default("LKR"),
  timezone: z.string().optional().default("UTC"),
  socialLinks: z
    .object({
      facebook: z.string().optional().default(""),
      instagram: z.string().optional().default(""),
      twitter: z.string().optional().default(""),
    })
    .optional(),
  orderSettings: z
    .object({
      autoConfirmOrders: z.boolean().optional().default(false),
      allowCancellationWindowHours: z.coerce.number().optional().default(24),
      minOrderAmount: z.coerce.number().optional().default(0),
    })
    .optional(),
  inventorySettings: z
    .object({
      defaultLowStockThreshold: z.coerce.number().optional().default(5),
      allowBackorder: z.boolean().optional().default(false),
    })
    .optional(),
  emailSettings: z
    .object({
      lowStockAlerts: z.boolean().optional().default(true),
      newOrderAlerts: z.boolean().optional().default(true),
      orderStatusUpdates: z.boolean().optional().default(true),
      newCustomerAlerts: z.boolean().optional().default(true),
    })
    .optional(),
});

export const adminProfileSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  avatar: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().min(1),
      })
    )
    .min(1),
  billingAddress: z.record(z.string(), z.string()).optional().default({}),
  shippingAddress: z.record(z.string(), z.string()).optional().default({}),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().default("cod"),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  discount: z.coerce.number().min(0).optional().default(0),
  shippingFee: z.coerce.number().min(0).optional().default(0),
  tax: z.coerce.number().min(0).optional().default(0),
  notes: z.string().optional().default(""),
});

export const inviteAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(ADMIN_ROLES),
});
