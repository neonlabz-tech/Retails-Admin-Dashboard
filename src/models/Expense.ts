import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/constants";

export interface IExpense extends Document {
  title: string;
  description?: string;
  category: ExpenseCategory | string;
  amount: number;
  date: Date;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    category: {
      type: String,
      default: "Other",
      trim: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now, index: true },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

ExpenseSchema.index({ title: "text", description: "text" });

export const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
