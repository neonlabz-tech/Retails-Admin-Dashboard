import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { apiSuccess, handleApiError } from "@/lib/api-utils";
import { getPaginationParams, buildPaginationMeta, escapeRegex } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const stockFilter = searchParams.get("stockFilter") || "";
    const { page, limit, skip } = getPaginationParams(searchParams);

    const filter: Record<string, unknown> = {};
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [{ name: { $regex: escaped, $options: "i" } }, { sku: { $regex: escaped, $options: "i" } }];
    }
    if (stockFilter === "out") filter.stock = { $lte: 0 };
    if (stockFilter === "low") {
      filter.$expr = { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }] };
    }
    if (stockFilter === "in") {
      filter.$expr = { $gt: ["$stock", "$lowStockThreshold"] };
    }

    const [products, total, summary] = await Promise.all([
      Product.find(filter).populate("category", "name").sort({ stock: 1 }).skip(skip).limit(limit),
      Product.countDocuments(filter),
      Product.aggregate([
        {
          $group: {
            _id: null,
            totalStock: { $sum: "$stock" },
            outOfStock: { $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } },
            lowStock: {
              $sum: {
                $cond: [{ $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    return apiSuccess({
      products,
      meta: buildPaginationMeta(total, page, limit),
      summary: summary[0] || { totalStock: 0, outOfStock: 0, lowStock: 0 },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
