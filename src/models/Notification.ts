import mongoose, { Schema, type Document, type Model } from "mongoose";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/constants";

export interface INotification extends Document {
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  read?: boolean;
  relatedId?: string;
  relatedType?: string;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    read: { type: Boolean, default: false },
    relatedId: { type: String, default: "" },
    relatedType: { type: String, default: "" },
    link: { type: String, default: "" },
  },
  { timestamps: true }
);

if (mongoose.models.Notification) {
  delete mongoose.models.Notification;
}

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
