import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Category } from "@/models/Category";
import { apiSuccess, handleApiError } from "@/lib/api-utils";
import { escapeRegex } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get("days");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const categoryParam = searchParams.get("category");
    const searchParam = searchParams.get("search");

    let startDate: Date;
    let endDate: Date = new Date();

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const days = Math.max(1, Number(daysParam) || 14);
      startDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // 1. Fetch active categories for dropdown
    const categories = await Category.find({ isActive: true })
      .select("_id name")
      .sort({ name: 1 })
      .lean();

    // 2. Build order match criteria
    const matchOrder: Record<string, unknown> = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $nin: ["cancelled", "refunded"] },
    };

    // 3. Aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchOrder },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
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
          ordersSet: { $addToSet: "$_id" },
          itemNames: { $push: "$items.name" },
          itemImages: { $push: "$items.image" },
          itemSkus: { $push: "$items.sku" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDoc",
        },
      },
      {
        $unwind: {
          path: "$productDoc",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "productDoc.category",
          foreignField: "_id",
          as: "categoryDoc",
        },
      },
      {
        $unwind: {
          path: "$categoryDoc",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          unitsSold: 1,
          revenue: 1,
          ordersCount: { $size: "$ordersSet" },
          name: {
            $ifNull: ["$productDoc.name", { $arrayElemAt: ["$itemNames", 0] }],
          },
          image: {
            $ifNull: [
              { $arrayElemAt: ["$productDoc.images", 0] },
              { $arrayElemAt: ["$itemImages", 0] },
            ],
          },
          sku: {
            $ifNull: ["$productDoc.sku", { $arrayElemAt: ["$itemSkus", 0] }],
          },
          categoryId: "$productDoc.category",
          categoryName: {
            $ifNull: ["$categoryDoc.name", "General"],
          },
        },
      },
    ];

    // Optional Category filter
    if (categoryParam && categoryParam !== "all") {
      if (mongoose.Types.ObjectId.isValid(categoryParam)) {
        pipeline.push({
          $match: {
            $or: [
              { categoryId: new mongoose.Types.ObjectId(categoryParam) },
              { categoryName: categoryParam },
            ],
          },
        });
      } else {
        pipeline.push({
          $match: { categoryName: categoryParam },
        });
      }
    }

    // Optional Search filter by product name or SKU
    if (searchParam && searchParam.trim()) {
      const reg = new RegExp(escapeRegex(searchParam.trim()), "i");
      pipeline.push({
        $match: {
          $or: [{ name: { $regex: reg } }, { sku: { $regex: reg } }],
        },
      });
    }

    // Sort by units sold descending by default
    pipeline.push({ $sort: { unitsSold: -1, revenue: -1 } });
    pipeline.push({ $limit: 50 });

    const items = await Order.aggregate(pipeline);

    return apiSuccess({
      items,
      categories,
      meta: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalItems: items.length,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
