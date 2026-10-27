import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";
import { apiSuccess, handleApiError } from "@/lib/api-utils";
import { getPaginationParams, buildPaginationMeta } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const method = searchParams.get("method") || "";
    const { page, limit, skip } = getPaginationParams(searchParams);

    const filter: Record<string, unknown> = {};
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { orderNumber: { $regex: escapedSearch, $options: "i" } },
        { transactionId: { $regex: escapedSearch, $options: "i" } },
      ];
    }
    if (status) filter.status = status === "cancelled" ? { $in: ["cancelled", "failed"] } : status;
    if (method) filter.method = method;

    // Automatically ensure payment records exist for all orders (e.g. placed via customer storefront)
    const existingPaymentOrderIds = await Payment.distinct("order");
    const missingOrders = await Order.find({ _id: { $nin: existingPaymentOrderIds } });

    if (missingOrders.length > 0) {
      const newPayments = missingOrders.map((order) => {
        const paymentRecordStatus =
          order.paymentStatus === "paid"
            ? "completed"
            : order.paymentStatus === "failed"
            ? "cancelled"
            : order.paymentStatus === "refunded"
            ? "refunded"
            : "pending";

        return {
          order: order._id,
          orderNumber: order.orderNumber,
          customer: order.customer,
          amount: order.total,
          method: order.paymentMethod || "cod",
          status: paymentRecordStatus,
          gateway: order.paymentMethod === "cod" ? "cod" : "manual",
          paidAt: order.paymentStatus === "paid" ? order.updatedAt || order.createdAt : undefined,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        };
      });

      try {
        await Payment.insertMany(newPayments, { ordered: false });
      } catch (err) {
        console.warn("[payments] Bulk insert warning:", err);
      }
    }

    const [payments, total, summary] = await Promise.all([
      Payment.find(filter)
        .populate("customer", "name email")
        .populate("order", "customerSnapshot")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
      Payment.aggregate([{ $group: { _id: "$status", total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    ]);

    return apiSuccess({ payments, meta: buildPaginationMeta(total, page, limit), summary });
  } catch (err) {
    return handleApiError(err);
  }
}
