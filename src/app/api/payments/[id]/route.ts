import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Order } from "@/models/Order";
import { Customer } from "@/models/Customer";
import { paymentStatusSchema } from "@/lib/validators";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-utils";
import { notifyPaymentUpdate } from "@/lib/notify";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const payment = await Payment.findById(id).populate("customer", "name email").populate("order");
    if (!payment) return apiError("Payment not found", 404);
    return apiSuccess(payment);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const data = paymentStatusSchema.parse(body);

    const payment = await Payment.findById(id);
    if (!payment) return apiError("Payment not found", 404);

    payment.status = data.status;
    if (data.transactionId !== undefined) payment.transactionId = data.transactionId;
    if (data.status === "completed") {
      if (!payment.paidAt) payment.paidAt = new Date();
    } else {
      payment.paidAt = undefined;
    }
    await payment.save();

    const paymentStatusMap: Record<string, "pending" | "paid" | "failed" | "refunded"> = {
      pending: "pending",
      completed: "paid",
      cancelled: "failed",
      failed: "failed",
      refunded: "refunded",
    };
    await Order.findByIdAndUpdate(payment.order, { paymentStatus: paymentStatusMap[data.status] });
    await notifyPaymentUpdate(payment.orderNumber, data.status);

    return apiSuccess(payment, "Payment status updated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
