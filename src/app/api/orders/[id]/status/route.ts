import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Payment } from "@/models/Payment";
import { orderStatusSchema } from "@/lib/validators";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-utils";
import { notifyOrderStatusChange } from "@/lib/notify";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { status, paymentStatus, note, shippingFee } = orderStatusSchema.parse(body);

    const order = await Order.findById(id);
    if (!order) return apiError("Order not found", 404);

    const previousStatus = order.status;

    // Validate shipping fee is required when status is shipped
    if (status === "shipped") {
      if (shippingFee === undefined || typeof shippingFee !== "number" || isNaN(shippingFee) || shippingFee < 0) {
        return apiError("Shipping fee is required when marking order as shipped", 400);
      }
    }

    // If shipping fee is updated, adjust shippingFee and recalculate order total
    if (typeof shippingFee === "number" && !isNaN(shippingFee) && shippingFee >= 0) {
      order.shippingFee = shippingFee;
      const subtotal = order.subtotal ?? 0;
      const discount = order.discount ?? 0;
      order.total = Math.max(0, subtotal - discount + shippingFee);
    }

    if (status && status === "cancelled" && previousStatus !== "cancelled") {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity, totalSold: -item.quantity } });
      }
    }

    // If order is delivered, payment is collected/completed (paid)
    let finalPaymentStatus = paymentStatus;
    if (status === "delivered" && (!paymentStatus || paymentStatus === "pending")) {
      finalPaymentStatus = "paid";
    }

    let finalStatus = status;
    const effectivePayment = finalPaymentStatus || order.paymentStatus;
    if (effectivePayment === "pending" && (!finalStatus || finalStatus === "pending")) {
      finalStatus = "processing";
    }

    if (finalStatus) {
      order.status = finalStatus;
      order.statusHistory.push({ status: finalStatus, changedAt: new Date(), note });
    }

    if (finalPaymentStatus || shippingFee !== undefined) {
      if (finalPaymentStatus) {
        order.paymentStatus = finalPaymentStatus;
      }
      const effectivePayStatus = finalPaymentStatus || order.paymentStatus;
      const paymentRecordStatus =
        effectivePayStatus === "paid"
          ? "completed"
          : effectivePayStatus === "failed"
          ? "failed"
          : effectivePayStatus === "refunded"
          ? "refunded"
          : "pending";
      await Payment.updateOne(
        { order: order._id },
        {
          $set: {
            orderNumber: order.orderNumber,
            customer: order.customer,
            amount: order.total,
            method: order.paymentMethod || "cod",
            status: paymentRecordStatus,
            ...(effectivePayStatus === "paid" ? { paidAt: new Date() } : {}),
          },
          $setOnInsert: {
            gateway: order.paymentMethod === "cod" ? "cod" : "manual",
            createdAt: order.createdAt,
          },
        },
        { upsert: true }
      );
    }

    await order.save();

    if (finalStatus) {
      await notifyOrderStatusChange(
        order.orderNumber,
        finalStatus,
        order.customerSnapshot?.email || "",
        order.customerSnapshot?.name || "Customer",
        order._id.toString(),
        {
          subtotal: order.subtotal,
          shippingFee: order.shippingFee,
          discount: order.discount,
          total: order.total,
          paymentMethod: order.paymentMethod,
          shippingAddress: order.shippingAddress,
          customerSnapshot: order.customerSnapshot,
          note,
          items: order.items?.map((it) => ({
            name: it.name,
            quantity: it.quantity,
            price: it.price,
          })),
        }
      );
    }

    return apiSuccess(order, "Order updated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
