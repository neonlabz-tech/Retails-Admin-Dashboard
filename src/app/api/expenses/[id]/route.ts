import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Expense } from "@/models/Expense";
import { expenseSchema } from "@/lib/validators";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-utils";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const expense = await Expense.findById(id);
    if (!expense) return apiError("Expense not found", 404);
    return apiSuccess(expense);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const partialSchema = expenseSchema.partial();
    const data = partialSchema.parse(body);

    const expense = await Expense.findByIdAndUpdate(id, data, { new: true });
    if (!expense) return apiError("Expense not found", 404);

    return apiSuccess(expense, "Expense updated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) return apiError("Expense not found", 404);

    return apiSuccess({ id }, "Expense deleted successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
