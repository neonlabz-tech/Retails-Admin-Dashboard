import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Expense } from "@/models/Expense";
import { expenseSchema } from "@/lib/validators";
import { apiSuccess, handleApiError } from "@/lib/api-utils";
import { getPaginationParams, buildPaginationMeta } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const { page, limit, skip } = getPaginationParams(searchParams);

    const filter: Record<string, unknown> = {};

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (startDateParam || endDateParam) {
      const dateFilter: Record<string, Date> = {};
      if (startDateParam) {
        const s = new Date(startDateParam);
        s.setHours(0, 0, 0, 0);
        dateFilter.$gte = s;
      }
      if (endDateParam) {
        const e = new Date(endDateParam);
        e.setHours(23, 59, 59, 999);
        dateFilter.$lte = e;
      }
      filter.date = dateFilter;
    }

    const [expenses, total, summary] = await Promise.all([
      Expense.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit),
      Expense.countDocuments(filter),
      Expense.aggregate([
        { $match: filter },
        { $group: { _id: "$category", totalAmount: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { totalAmount: -1 } },
      ]),
    ]);

    const totalExpensesAmount = summary.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

    return apiSuccess({
      expenses,
      meta: buildPaginationMeta(total, page, limit),
      totalExpenses: totalExpensesAmount,
      categorySummary: summary,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const data = expenseSchema.parse(body);

    const expense = await Expense.create({
      title: data.title,
      description: data.description,
      category: data.category,
      amount: data.amount,
      date: data.date,
      notes: data.notes,
    });

    return apiSuccess(expense, "Expense added successfully", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
