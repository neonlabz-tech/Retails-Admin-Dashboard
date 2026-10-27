import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export type ReviewStatus = "approved" | "pending" | "rejected";

export interface IReview extends Document {
  orderId: string;
  order?: Types.ObjectId;
  orderDate?: Date;
  customerName: string;
  customerEmail?: string;
  author?: string;
  email?: string;
  customer?: Types.ObjectId;
  productId: Types.ObjectId | string;
  product?: Types.ObjectId;
  productSlug?: string;
  productName?: string;
  rating: number; // 1 - 5 stars
  comment: string;
  body?: string;
  title?: string;
  images?: string[];
  status: ReviewStatus;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    orderId: { type: String, default: "", trim: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    orderDate: { type: Date, default: Date.now },
    customerName: { type: String, default: "", trim: true },
    customerEmail: { type: String, trim: true, default: "" },
    author: { type: String, trim: true },
    email: { type: String, trim: true },
    body: { type: String, trim: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer" },
    productId: { type: Schema.Types.Mixed, required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    productSlug: { type: String, default: "", index: true },
    productName: { type: String, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true },
    title: { type: String, default: "", trim: true },
    images: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "pending",
      index: true,
    },
    helpfulCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ReviewSchema.index({ status: 1, createdAt: -1 });
ReviewSchema.index({ orderId: 1, createdAt: -1 });
ReviewSchema.index({ productSlug: 1, status: 1, createdAt: -1 });

// Always ensure model re-registration in Next.js development
if (mongoose.models.Review) {
  delete mongoose.models.Review;
}

export const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);
