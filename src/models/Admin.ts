import mongoose, { Schema, type Document, type Model } from "mongoose";
import { ADMIN_ROLES, type AdminRole } from "@/lib/constants";

export interface IAdmin extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ADMIN_ROLES, default: "admin" },
    avatar: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production" && mongoose.models.Admin) {
  if (!mongoose.models.Admin.schema.path("resetPasswordToken")) {
    delete (mongoose.models as Record<string, unknown>).Admin;
  }
}

export const Admin: Model<IAdmin> = mongoose.models.Admin || mongoose.model<IAdmin>("Admin", AdminSchema);
