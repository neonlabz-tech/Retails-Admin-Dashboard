import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Payment } from "@/models/Payment";
import { StockLog } from "@/models/StockLog";
import { getSession } from "@/lib/auth";
import { orderStatusSchema } from "@/lib/validators";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-utils";
import { notifyOrderStatusChange } from "@/lib/notify";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const session = await getSession();
    const { id } = await params;
    const body = await request.json();
    const { status, paymentStatus, note } = orderStatusSchema.parse(body);

    const order = await Order.findById(id);
    if (!order) return apiError("Order not found", 404);

    const previousStatus = order.status;

    if (status && status === "cancelled" && previousStatus !== "cancelled") {
      for (const item of order.items) {
        const prod = await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity, totalSold: -item.quantity } },
          { new: false }
        );
        if (prod) {
          const prev = prod.stock;
          const next = prev + item.quantity;
          await StockLog.create({
            product: prod._id,
            productName: prod.name,
            type: "return",
            quantity: item.quantity,
            previousStock: prev,
            newStock: next,
            reason: `Order ${order.orderNumber} cancelled`,
            ...(session ? { admin: session.adminId, adminName: session.name } : { adminName: "System" }),
          });
        }
      }
    } else if (status && status !== "cancelled" && previousStatus === "cancelled") {
      for (const item of order.items) {
        const prod = await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: -item.quantity, totalSold: item.quantity } },
          { new: false }
        );
        if (prod) {
          const prev = prod.stock;
          const next = prev - item.quantity;
          await StockLog.create({
            product: prod._id,
            productName: prod.name,
            type: "sale",
            quantity: item.quantity,
            previousStock: prev,
            newStock: next,
            reason: `Order ${order.orderNumber} restored / re-activated`,
            ...(session ? { admin: session.adminId, adminName: session.name } : { adminName: "System" }),
          });
        }
      }
    }

    // If order is delivered, payment is collected/completed (paid)
    let finalPaymentStatus = paymentStatus;
    if (status === "delivered" && (!paymentStatus || paymentStatus === "pending")) {
      finalPaymentStatus = "paid";
    }

    let finalStatus = status;
    const effectivePayment = finalPaymentStatus || order.paymentStatus;
    if (effectivePayment === "pending" && !finalStatus) {
      finalStatus = "processing";
    }

    if (finalStatus) {
      order.status = finalStatus;
      order.statusHistory.push({ status: finalStatus, changedAt: new Date(), note });
    }

    if (finalPaymentStatus) {
      order.paymentStatus = finalPaymentStatus;
      const paymentRecordStatus =
        finalPaymentStatus === "paid"
          ? "completed"
          : finalPaymentStatus === "failed"
          ? "cancelled"
          : finalPaymentStatus === "refunded"
          ? "refunded"
          : "pending";
      await Payment.findOneAndUpdate(
        { order: order._id },
        {
          $set: {
            orderNumber: order.orderNumber,
            customer: order.customer,
            amount: order.total,
            method: order.paymentMethod || "cod",
            status: paymentRecordStatus,
            ...(finalPaymentStatus === "paid" ? { paidAt: new Date() } : {}),
          },
          $setOnInsert: {
            gateway: order.paymentMethod === "cod" ? "cod" : "manual",
            createdAt: order.createdAt,
          },
        },
        { upsert: true }
      );
    }

    await order.save({ validateModifiedOnly: true });

    if (finalStatus) {
      await notifyOrderStatusChange(
        order.orderNumber,
        finalStatus,
        order.customerSnapshot?.email || "",
        order.customerSnapshot?.name || "Customer",
        order._id.toString()
      );
    }

    return apiSuccess(order, "Order updated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
