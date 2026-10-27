import mongoose, { Schema, type Document, type Model } from "mongoose";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/constants";

export interface INotification extends Document {
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: string;
  relatedType?: string;
  link?: string;
  customer?: unknown;
  customerEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    relatedId: { type: String, default: "" },
    relatedType: { type: String, default: "" },
    link: { type: String, default: "" },
    customer: { type: Schema.Types.Mixed, default: undefined },
    customerEmail: { type: String, default: undefined },
  },
  { timestamps: true }
);

<<<<<<< Updated upstream
=======
/**
 * Filter conditions for admin-only notifications.
 * The shared notifications collection also contains customer-facing notifications
 * (which include customer / customerEmail references and customer-specific types like order_update, order_delivered).
 */
export const ADMIN_NOTIFICATION_CONDITIONS: Array<Record<string, unknown>> = [
  {
    $or: [
      { customer: { $exists: false } },
      { customer: null },
      { customer: "" },
    ],
  },
  {
    $or: [
      { customerEmail: { $exists: false } },
      { customerEmail: null },
      { customerEmail: "" },
    ],
  },
  {
    type: { $nin: ["order_update", "order_delivered"] },
  },
];

if (mongoose.models.Notification) {
  delete mongoose.models.Notification;
}

>>>>>>> Stashed changes
export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
