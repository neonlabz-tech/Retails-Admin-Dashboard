import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, type OrderStatus, type PaymentMethod, type PaymentStatus } from "@/lib/constants";

export interface IOrderItem {
  product: Types.ObjectId;
  name: string;
  image?: string;
  sku?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface IOrderAddress {
  fullName?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
}

export interface IStatusHistoryItem {
  status: OrderStatus;
  changedAt: Date;
  note?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  customer: Types.ObjectId;
  customerSnapshot: { name: string; email: string; phone?: string };
  items: IOrderItem[];
  billingAddress: IOrderAddress;
  shippingAddress: IOrderAddress;
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  statusHistory: IStatusHistoryItem[];
  notes?: string;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSubSchema = new Schema<IOrderAddress>(
  {
    fullName: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    phone: String,
  },
  { _id: false }
);

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    sku: { type: String, default: "" },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    customerSnapshot: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, default: "" },
    },
    items: { type: [OrderItemSchema], default: [] },
    billingAddress: { type: AddressSubSchema, default: {} },
    shippingAddress: { type: AddressSubSchema, default: {} },
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "pending" },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "cod" },
    status: { type: String, enum: ORDER_STATUSES, default: "processing" },
    statusHistory: {
      type: [{ status: { type: String }, changedAt: { type: Date }, note: { type: String } }],
      default: [],
    },
    notes: { type: String, default: "" },
    cancelReason: { type: String, default: "" },
  },
  { timestamps: true }
);

OrderSchema.index({ orderNumber: "text", "customerSnapshot.name": "text", "customerSnapshot.email": "text" });

if (mongoose.models.Order) {
  delete mongoose.models.Order;
}

export const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
