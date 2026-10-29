import { z } from "zod";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, PAYMENT_RECORD_STATUSES, STOCK_LOG_TYPES, ADMIN_ROLES } from "./constants";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const subcategorySchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, "Subcategory name is required"),
  slug: z.string().optional(),
  description: z.string().optional().default(""),
  image: z.string().optional().default(""),
  productCount: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional().default(""),
  image: z.string().optional().default(""),
  isFeatured: z.boolean().optional().default(false),
  subcategories: z.array(z.union([z.string().min(1), subcategorySchema])).optional().default([]),
});

export const specificationSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
});

export const variantSchema = z.object({
  name: z.string().trim().min(1, "Variant name/type is required"),
  price: z.coerce.number({ message: "Variant price is required" }).min(0, "Variant price must be 0 or more"),
  salePrice: z.coerce.number().min(0).optional().nullable(),
  stock: z.coerce.number({ message: "Variant stock is required" }).min(0, "Variant stock must be 0 or more"),
  lowStockThreshold: z.coerce.number().min(0).optional().default(5),
  sku: z.string().trim().optional().default(""),
});

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().trim().optional().default(""),
  price: z.coerce.number().min(0).optional().default(0),
  salePrice: z.coerce.number().min(0).optional().nullable(),
  sku: z.string().trim().min(1, "SKU / Product code is required"),
  weight: z.coerce.number({ message: "Weight is required" }).min(0, "Weight must be 0 or more").optional().default(0),
  images: z
    .array(z.string())
    .min(1, "At least 1 product image is required")
    .max(5, "A product can have a maximum of 5 images"),
  variants: z.array(variantSchema).optional().default([]),
  specifications: z.array(specificationSchema).optional().default([]),
  stock: z.coerce.number().min(0).optional().default(0),
  lowStockThreshold: z.coerce.number().min(0).optional().default(5),
  status: z.enum(["active", "draft", "archived"] as const, { message: "Status is required" }),
  isFeatured: z.boolean().optional().default(false),
  tags: z.union([z.array(z.string()), z.string()]).optional().default([]),
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
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
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
      lowStockAlerts: z.boolean().optional().default(true),
      outOfStockThreshold: z.coerce.number().optional().default(0),
      hideOutOfStock: z.boolean().optional().default(false),
    })
    .optional(),
  emailNotifications: z
    .object({
      newOrder: z.boolean().optional().default(true),
      lowStock: z.boolean().optional().default(true),
      customerSignup: z.boolean().optional().default(false),
      orderStatusUpdate: z.boolean().optional().default(true),
    })
    .optional(),
  paymentGateways: z
    .object({
      codEnabled: z.boolean().optional().default(true),
      bankTransferEnabled: z.boolean().optional().default(false),
      bankDetails: z.string().optional().default(""),
    })
    .optional(),
});

export const adminProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .min(2, "Full name must be at least 2 characters")
    .regex(/^[a-zA-Z\s.'-]+$/, "Full name can only contain letters and spaces"),
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  avatar: z.string().optional(),
});

export function validateName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Full name is required";
  if (trimmed.length < 2) return "Full name must be at least 2 characters";
  if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) return "Full name can only contain letters and spaces";
  return "";
}

export function validateEmail(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Email address is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return "Please enter a valid email address (e.g., admin@example.com)";
  }
  return "";
}

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, "Current password is required")
    .min(6, "Current password must be at least 6 characters"),
  newPassword: z
    .string()
    .min(1, "New password is required")
    .min(6, "New password must be at least 6 characters"),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantName: z.string().trim().optional().default(""),
        quantity: z.coerce.number().int().positive(),
      })
    )
    .min(1, "At least one item is required"),
  shippingAddress: z.record(z.string(), z.string()).optional().default({}),
  billingAddress: z.record(z.string(), z.string()).optional().default({}),
  paymentMethod: z.enum(PAYMENT_METHODS),
  discount: z.coerce.number().min(0).optional().default(0),
  shippingFee: z.coerce.number().min(0).optional().default(0),
  tax: z.coerce.number().min(0).optional().default(0),
  notes: z.string().optional().default(""),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
});

export const inviteAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(ADMIN_ROLES),
});

export const expenseSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional().default(""),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  date: z.coerce.date().optional().default(() => new Date()),
  notes: z.string().optional().default(""),
});
