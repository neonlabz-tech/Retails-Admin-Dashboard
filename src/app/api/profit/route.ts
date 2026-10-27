import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Expense } from "@/models/Expense";
import { apiSuccess, handleApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const timelineTimeframe = searchParams.get("timeframe") || "this-week";
    const bestSellingTimeframe = searchParams.get("bestSellingTimeframe") || "this-month";
    const expensesTimeframe = searchParams.get("expensesTimeframe") || "this-month";

    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const bestSellingStartDateParam = searchParams.get("bestSellingStartDate");
    const bestSellingEndDateParam = searchParams.get("bestSellingEndDate");
    const expensesStartDateParam = searchParams.get("expensesStartDate");
    const expensesEndDateParam = searchParams.get("expensesEndDate");

    const now = new Date();

    function parseDateRange(
      tf: string,
      customStart: string | null,
      customEnd: string | null,
      refDate: Date
    ): { startDate: Date; endDate: Date } {
      if (customStart && customEnd) {
        const s = new Date(customStart);
        s.setHours(0, 0, 0, 0);
        const e = new Date(customEnd);
        e.setHours(23, 59, 59, 999);
        return { startDate: s, endDate: e };
      }
      if (tf === "all-time") {
        return { startDate: new Date(2020, 0, 1), endDate: new Date(2099, 11, 31, 23, 59, 59, 999) };
      }
      if (tf === "this-week") {
        const day = refDate.getDay();
        const diffToMonday = (day === 0 ? -6 : 1) - day;
        const s = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + diffToMonday);
        s.setHours(0, 0, 0, 0);
        const e = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + (diffToMonday + 6));
        e.setHours(23, 59, 59, 999);
        return { startDate: s, endDate: e };
      }
      if (tf === "this-year") {
        const s = new Date(refDate.getFullYear(), 0, 1);
        s.setHours(0, 0, 0, 0);
        const e = new Date(refDate.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { startDate: s, endDate: e };
      }
      // Default: "this-month"
      const s = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      s.setHours(0, 0, 0, 0);
      const e = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59, 999);
      return { startDate: s, endDate: e };
    }

    // 1. Timeline & Revenue Trend Range
    const timelineRange = parseDateRange(timelineTimeframe, startDateParam, endDateParam, now);
    const startDate = timelineRange.startDate;
    const endDate = timelineRange.endDate;

    // 2. Best Selling Products Range (independent card dropdown)
    const bestSellingRange = parseDateRange(
      bestSellingTimeframe,
      bestSellingStartDateParam,
      bestSellingEndDateParam,
      now
    );

    // 3. Expenses Breakdown Range (independent card dropdown)
    const expensesRange = parseDateRange(
      expensesTimeframe,
      expensesStartDateParam,
      expensesEndDateParam,
      now
    );

    // Timeline paid orders match condition
    const paidOrdersMatch: Record<string, unknown> = {
      createdAt: { $gte: startDate, $lte: endDate },
      paymentStatus: "paid",
      status: { $ne: "cancelled" },
    };

    // Best-selling products match condition (uses bestSellingRange)
    const bestSellingMatch: Record<string, unknown> = {
      createdAt: { $gte: bestSellingRange.startDate, $lte: bestSellingRange.endDate },
      paymentStatus: "paid",
      status: { $ne: "cancelled" },
    };

    // Expenses card match condition (uses expensesRange)
    const expensesCardMatch = {
      date: { $gte: expensesRange.startDate, $lte: expensesRange.endDate },
    };

    // Timeline expenses match condition
    const timelineExpensesMatch = {
      date: { $gte: startDate, $lte: endDate },
    };

    // Parallel database aggregations
    const [
      paidRevenueAgg,
      totalPaidOrdersCount,
      expensesAgg,
      expensesByCategory,
      bestSellingAgg,
      ordersByDayAgg,
      expensesByDayAgg,
    ] = await Promise.all([
      // Total Paid Revenue (timeline range)
      Order.aggregate([
        { $match: paidOrdersMatch },
        { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
      ]),

      // Total Paid Orders Count (timeline range)
      Order.countDocuments(paidOrdersMatch),

      // Total Expenses (timeline range)
      Expense.aggregate([
        { $match: timelineExpensesMatch },
        { $group: { _id: null, totalExpenses: { $sum: "$amount" } } },
      ]),

      // Expenses by Category (expenses card range)
      Expense.aggregate([
        { $match: expensesCardMatch },
        { $group: { _id: "$category", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { amount: -1 } },
      ]),

      // Best Selling Products from PAID orders (best selling card range)
      Order.aggregate([
        { $match: bestSellingMatch },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            unitsSold: { $sum: "$items.quantity" },
            revenue: {
              $sum: {
                $cond: [
                  { $gt: ["$items.subtotal", 0] },
                  "$items.subtotal",
                  { $multiply: ["$items.quantity", "$items.price"] },
                ],
              },
            },
          },
        },
        { $sort: { unitsSold: -1 } },
        { $limit: 5 },
      ]),

      // Revenue by Day (for trend chart)
      Order.aggregate([
        { $match: paidOrdersMatch },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$total" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Expenses by Day (for trend chart)
      Expense.aggregate([
        { $match: timelineExpensesMatch },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            expenses: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const totalRevenue = paidRevenueAgg[0]?.totalRevenue || 0;
    const totalExpenses = expensesAgg[0]?.totalExpenses || 0;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) + "%" : "0%";

    // Format Expenses by Category with percentage
    const categoryColors: Record<string, string> = {
      "Salaries & Payroll": "#10b981", // Emerald/Green
      "Operations & Logistics": "#6366f1", // Indigo/Purple
      "Taxes & Compliance": "#f59e0b", // Amber/Yellow
      "Marketing & Ads": "#ec4899", // Pink
      "Utilities & Rent": "#06b6d4", // Cyan
      "Packaging & Supplies": "#8b5cf6", // Violet
      Other: "#64748b", // Slate
    };

    const totalExpensesInCard = expensesByCategory.reduce((sum, c) => sum + (c.amount || 0), 0);

    const formattedExpensesCategories = expensesByCategory.map((c, idx) => {
      const pct = totalExpensesInCard > 0 ? Math.round((c.amount / totalExpensesInCard) * 100) : 0;
      const palette = ["#10b981", "#6366f1", "#f59e0b", "#06b6d4", "#ec4899", "#8b5cf6", "#64748b"];
      return {
        category: c._id || "Other",
        amount: c.amount,
        percentage: pct,
        color: categoryColors[c._id] || palette[idx % palette.length],
        count: c.count,
      };
    });

    // Format Best Selling Products with percentage
    const totalUnitsSold = bestSellingAgg.reduce((sum, item) => sum + item.unitsSold, 0);
    const productPalette = ["#10b981", "#093b84", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

    const bestSellingProducts = bestSellingAgg.map((item, idx) => ({
      name: item._id,
      unitsSold: item.unitsSold,
      revenue: item.revenue,
      percentage: totalUnitsSold > 0 ? Math.round((item.unitsSold / totalUnitsSold) * 100) : 0,
      color: productPalette[idx % productPalette.length],
    }));
    const totalBestSellingUnits = bestSellingProducts.reduce((sum, item) => sum + item.unitsSold, 0);

    // Build timeline points for the "Revenue Generated" chart
    const revenueMap = new Map<string, number>();
    for (const r of ordersByDayAgg) {
      revenueMap.set(r._id, r.revenue);
    }
    const expenseMap = new Map<string, number>();
    for (const e of expensesByDayAgg) {
      expenseMap.set(e._id, e.expenses);
    }

    const timelineData: Array<{
      date: string;
      label: string;
      revenue: number;
      expenses: number;
      profit: number;
    }> = [];

    const dayDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const isSingleWeek = dayDiff <= 7;

    for (let i = 0; i < Math.min(dayDiff, 60); i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0];
      const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const label = isSingleWeek
        ? weekdayNames[d.getDay()]
        : `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

      const dayRev = revenueMap.get(dateStr) || 0;
      const dayExp = expenseMap.get(dateStr) || 0;

      timelineData.push({
        date: dateStr,
        label,
        revenue: dayRev,
        expenses: dayExp,
        profit: dayRev - dayExp,
      });
    }

    return apiSuccess({
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        paidOrdersCount: totalPaidOrdersCount,
      },
      bestSelling: {
        totalSold: totalBestSellingUnits,
        products: bestSellingProducts,
      },
      expenses: {
        total: totalExpensesInCard,
        categories: formattedExpensesCategories,
      },
      timeline: timelineData,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        timeframe: timelineTimeframe,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
