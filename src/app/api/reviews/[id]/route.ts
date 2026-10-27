import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Review } from "@/models/Review";
import { Product } from "@/models/Product";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-utils";
import { z } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

const updateReviewSchema = z.object({
  status: z.enum(["approved", "pending", "rejected"]).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  comment: z.string().trim().min(1).optional(),
  title: z.string().optional(),
});

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const review = await Review.findById(id).lean();
    if (!review) return apiError("Review not found", 404);

    let product = null;
    const pIdStr = String(review.productId || "");
    if (mongoose.Types.ObjectId.isValid(pIdStr) && pIdStr.length === 24) {
      product = await Product.findById(pIdStr).select("name sku slug images price category").lean();
    }
    if (!product && review.productSlug) {
      product = await Product.findOne({ slug: review.productSlug }).select("name sku slug images price category").lean();
    }

    return apiSuccess({
      ...review,
      productId: product || {
        _id: pIdStr,
        name: review.productName || "Product",
        slug: review.productSlug || "",
        images: Array.isArray(review.images) ? review.images : [],
      },
      orderId: review.orderId || "",
      customerName: review.customerName || review.author || "Customer",
      comment: review.comment || review.body || "",
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const data = updateReviewSchema.parse(body);

    const review = await Review.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!review) return apiError("Review not found", 404);

    return apiSuccess(review, "Review updated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const review = await Review.findByIdAndDelete(id);
    if (!review) return apiError("Review not found", 404);

    return apiSuccess(null, "Review deleted successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
