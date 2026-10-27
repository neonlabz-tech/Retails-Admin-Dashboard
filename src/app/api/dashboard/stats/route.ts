import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { Customer } from "@/models/Customer";
import { Expense } from "@/models/Expense";
import { apiSuccess, handleApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get("days");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const salesOnly = searchParams.get("salesOnly") === "true";

    let salesStart: Date;
    let salesEnd: Date;

    if (startDateParam && endDateParam) {
      salesStart = new Date(`${startDateParam}T00:00:00`);
      salesEnd = new Date(`${endDateParam}T23:59:59.999`);
    } else {
      const days = Math.max(1, Number(daysParam) || 14);
      const now = new Date();
      salesEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      salesStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1), 0, 0, 0, 0);
    }

    const rawSales = await Order.aggregate([
      { $match: { createdAt: { $gte: salesStart, $lte: salesEnd }, status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const salesMap = new Map<string, { sales: number; orders: number }>();
    rawSales.forEach((item) => {
      salesMap.set(item._id, { sales: item.sales, orders: item.orders });
    });

    const salesByDay: Array<{ _id: string; sales: number; orders: number }> = [];
    const current = new Date(salesStart);
    while (current <= salesEnd) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, "0");
      const d = String(current.getDate()).padStart(2, "0");
      const dateKey = `${y}-${m}-${d}`;
      const found = salesMap.get(dateKey);
      salesByDay.push({
        _id: dateKey,
        sales: found ? found.sales : 0,
        orders: found ? found.orders : 0,
      });
      current.setDate(current.getDate() + 1);
    }

    if (salesOnly) {
      return apiSuccess({ salesByDay });
    }

    await Order.updateMany(
      { status: { $in: ["pending", "refunded"] } as any },
      { $set: { status: "processing" } }
    );

    const [
      totalProducts,
      totalCustomers,
      totalOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      lowStockProducts,
      outOfStockProducts,
      salesAgg,
      recentOrders,
      recentCustomers,
      stockAgg,
      urgentStockProducts,
      expensesAgg,
      paidSalesAgg,
    ] = await Promise.all([
      Product.countDocuments(),
      Customer.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ status: "confirmed" }),
      Order.countDocuments({ status: "processing" }),
      Order.countDocuments({ status: "shipped" }),
      Order.countDocuments({ status: "delivered" }),
      Order.countDocuments({ status: "cancelled" }),
      Product.countDocuments({ $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }] } }),
      Product.countDocuments({ stock: { $lte: 0 } }),
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: null, totalSales: { $sum: "$total" } } },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(6),
      Customer.find().sort({ createdAt: -1 }).limit(6),
      Product.aggregate([{ $group: { _id: null, totalStock: { $sum: "$stock" } } }]),
      Product.find({
        $or: [
          { stock: { $lte: 0 } },
          { $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }] } },
        ],
      })
        .select("_id name sku stock lowStockThreshold images price")
        .sort({ stock: 1 })
        .limit(8),
      Expense.aggregate([
        { $group: { _id: null, totalExpenses: { $sum: "$amount" } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: "paid", status: { $ne: "cancelled" } } },
        { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
      ]),
    ]);

    const totalExpenses = expensesAgg[0]?.totalExpenses || 0;
    const totalRevenue = paidSalesAgg[0]?.totalRevenue || 0;
    const totalProfit = totalRevenue - totalExpenses;

    const inStockProducts = Math.max(0, totalProducts - (lowStockProducts + outOfStockProducts));
    const stockBreakdown = {
      total: totalProducts,
      inStock: inStockProducts,
      lowStock: lowStockProducts,
      outOfStock: outOfStockProducts,
      inStockPercent: totalProducts > 0 ? Math.round((inStockProducts / totalProducts) * 100) : 0,
      lowStockPercent: totalProducts > 0 ? Math.round((lowStockProducts / totalProducts) * 100) : 0,
      outOfStockPercent: totalProducts > 0 ? Math.round((outOfStockProducts / totalProducts) * 100) : 0,
      urgentItems: urgentStockProducts,
    };

    const ordersByStatus = [
      { status: "confirmed", count: confirmedOrders },
      { status: "processing", count: processingOrders },
      { status: "shipped", count: shippedOrders },
      { status: "delivered", count: deliveredOrders },
      { status: "cancelled", count: cancelledOrders },
    ];

    const topCategories = await Product.aggregate([
      { $group: { _id: "$category", productCount: { $sum: 1 }, totalStock: { $sum: "$stock" } } },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      { $sort: { productCount: -1 } },
      { $limit: 5 },
      { $project: { name: "$category.name", productCount: 1, totalStock: 1 } },
    ]);

    return apiSuccess({
      totals: {
        totalProducts,
        totalCustomers,
        totalOrders,
        totalSales: salesAgg[0]?.totalSales || 0,
        totalRevenue,
        totalExpenses,
        totalProfit,
        availableStock: stockAgg[0]?.totalStock || 0,
        lowStockProducts,
        outOfStockProducts,
        pendingOrders: processingOrders,
        completedOrders: deliveredOrders,
        cancelledOrders,
      },
      ordersByStatus,
      salesByDay,
      recentOrders,
      recentCustomers,
      topCategories,
      stockBreakdown,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
