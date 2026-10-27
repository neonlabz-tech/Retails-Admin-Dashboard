import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Review } from "@/models/Review";
import { Product } from "@/models/Product";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-utils";
import { getPaginationParams, buildPaginationMeta, escapeRegex } from "@/lib/utils";
import { z } from "zod";

const createReviewSchema = z.object({
  orderId: z.string().optional().default(""),
  customerName: z.string().trim().min(1, "Customer name is required"),
  customerEmail: z.string().trim().email("Valid email is required").optional().or(z.literal("")),
  rating: z.coerce.number().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  comment: z.string().trim().min(1, "Comment is required"),
  productId: z.string().min(1, "Product ID is required"),
  title: z.string().optional().default(""),
  status: z.enum(["approved", "pending", "rejected"]).optional().default("pending"),
});

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const rating = searchParams.get("rating") || "";
    const productId = searchParams.get("productId") || "";
    const { page, limit, skip } = getPaginationParams(searchParams);

    const filter: Record<string, unknown> = {
      orderId: { $exists: true, $nin: ["", null] },
    };

    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { orderId: { $regex: escaped, $options: "i" } },
        { customerName: { $regex: escaped, $options: "i" } },
        { author: { $regex: escaped, $options: "i" } },
        { comment: { $regex: escaped, $options: "i" } },
        { body: { $regex: escaped, $options: "i" } },
        { productName: { $regex: escaped, $options: "i" } },
        { productSlug: { $regex: escaped, $options: "i" } },
      ];
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (rating && rating !== "all") {
      filter.rating = Number(rating);
    }

    if (productId) {
      filter.productId = productId;
    }

    const [reviews, total, allStats] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: { orderId: { $exists: true, $nin: ["", null] } } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            avgRating: { $avg: "$rating" },
            approvedCount: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
            pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
            fiveStars: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const stats = allStats[0] || {
      totalReviews: 0,
      avgRating: 0,
      approvedCount: 0,
      pendingCount: 0,
      fiveStars: 0,
    };

    // Safely look up products by ObjectId or slug without triggering CastError
    const validProductIds = reviews
      .map((r) => String(r.productId || ""))
      .filter((id) => mongoose.Types.ObjectId.isValid(id) && id.length === 24);

    const productSlugs = reviews
      .map((r) => r.productSlug)
      .filter((s): s is string => Boolean(s));

    const productOr: Array<Record<string, unknown>> = [];
    if (validProductIds.length > 0) {
      productOr.push({ _id: { $in: validProductIds } });
    }
    if (productSlugs.length > 0) {
      productOr.push({ slug: { $in: productSlugs } });
    }

    const matchedProducts = productOr.length > 0
      ? await Product.find({ $or: productOr })
          .select("name sku slug images price category")
          .lean()
      : [];

    const productById = new Map(matchedProducts.map((p) => [p._id.toString(), p]));
    const productBySlug = new Map(matchedProducts.map((p) => [p.slug, p]));

    const normalizedReviews = (reviews as unknown as Array<Record<string, unknown>>).map((r) => {
      const pIdStr = String(r.productId || "");
      const foundProduct =
        productById.get(pIdStr) ||
        (r.productSlug ? productBySlug.get(String(r.productSlug)) : null);

      const productObj = foundProduct
        ? foundProduct
        : {
            _id: pIdStr,
            name: (r.productName as string) || "Product",
            slug: (r.productSlug as string) || "",
            sku: "",
            images: Array.isArray(r.images) && r.images.length > 0 ? r.images : [],
          };

      return {
        ...r,
        productId: productObj,
        orderId: (r.orderId as string) || "",
        customerName: (r.customerName as string) || (r.author as string) || "Customer",
        customerEmail: (r.customerEmail as string) || (r.email as string) || "",
        comment: (r.comment as string) || (r.body as string) || "",
        orderDate: (r.orderDate as string | Date) || (r.createdAt as string | Date) || new Date(),
      };
    });

    return apiSuccess({
      reviews: normalizedReviews,
      meta: buildPaginationMeta(total, page, limit),
      stats: {
        totalReviews: stats.totalReviews,
        avgRating: Number((stats.avgRating || 0).toFixed(1)),
        approvedCount: stats.approvedCount,
        pendingCount: stats.pendingCount,
        fiveStars: stats.fiveStars,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const data = createReviewSchema.parse(body);

    let product = null;
    if (mongoose.Types.ObjectId.isValid(data.productId) && data.productId.length === 24) {
      product = await Product.findById(data.productId);
    }
    if (!product) {
      product = await Product.findOne({ slug: data.productId });
    }

    if (!product) {
      return apiError("Product not found with specified ID", 404);
    }

    let finalOrderId = (data.orderId ? String(data.orderId).trim() : "");
    let finalOrderDate = new Date();

    if (!finalOrderId && (data.customerEmail || data.customerName)) {
      try {
        const orderQuery: Record<string, unknown> = {};
        if (data.customerEmail) {
          orderQuery["customerSnapshot.email"] = data.customerEmail.toLowerCase().trim();
        } else if (data.customerName) {
          orderQuery["customerSnapshot.name"] = new RegExp(`^${data.customerName.trim()}$`, "i");
        }
        const matchedOrder = await mongoose.connection.db
          ?.collection("orders")
          ?.findOne(orderQuery, { sort: { createdAt: -1 } });
        if (matchedOrder?.orderNumber) {
          finalOrderId = String(matchedOrder.orderNumber);
          if (matchedOrder.createdAt) finalOrderDate = new Date(matchedOrder.createdAt as string | Date);
        }
      } catch {
        // Silently continue if order lookup fails
      }
    }

    const review = await Review.create({
      orderId: finalOrderId,
      orderDate: finalOrderDate,
      customerName: data.customerName,
      customerEmail: data.customerEmail || "",
      author: data.customerName,
      email: data.customerEmail || "",
      rating: data.rating,
      comment: data.comment,
      body: data.comment,
      title: data.title || "",
      productId: product._id,
      product: product._id,
      productSlug: product.slug,
      productName: product.name,
      status: data.status,
    });

    return apiSuccess(review, "Review created successfully", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
