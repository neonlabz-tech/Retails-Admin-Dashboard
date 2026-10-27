import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-utils";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const order = await Order.findById(id).populate("customer", "name email phone");
    if (!order) return apiError("Order not found", 404);
    if (order.paymentStatus === "pending" && (order.status as string) === "pending") {
      order.status = "processing";
      await order.save({ validateModifiedOnly: true });
    }
    return apiSuccess(order);
  } catch (err) {
    return handleApiError(err);
  }
}
