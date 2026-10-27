import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";
import { customerStatusSchema } from "@/lib/validators";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-utils";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const customer = await Customer.findById(id);
    if (!customer) return apiError("Customer not found", 404);
    const orders = await Order.find({ customer: id }).sort({ createdAt: -1 }).limit(20);
    return apiSuccess({ customer, orders });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const data = customerStatusSchema.parse(body);

    const update: Record<string, boolean> = {};
    if (data.isActive !== undefined) update.isActive = data.isActive;
    if (data.isVerified !== undefined) update.isVerified = data.isVerified;

    const customer = await Customer.findByIdAndUpdate(id, update, { new: true });
    if (!customer) return apiError("Customer not found", 404);
    return apiSuccess(customer, "Customer updated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const orderCount = await Order.countDocuments({ customer: id });
    if (orderCount > 0) {
      return apiError(`Cannot delete this customer because they have ${orderCount} order(s) on record.`, 409);
    }
    const customer = await Customer.findByIdAndDelete(id);
    if (!customer) return apiError("Customer not found", 404);
    return apiSuccess(null, "Customer deleted successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
