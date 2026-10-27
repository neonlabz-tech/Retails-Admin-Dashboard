import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { categorySchema } from "@/lib/validators";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-utils";
import { slugify, getPaginationParams, buildPaginationMeta, escapeRegex } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const all = searchParams.get("all") === "true";
    const { page, limit, skip } = getPaginationParams(searchParams);

    const filter: Record<string, unknown> = {};
    if (search) filter.name = { $regex: escapeRegex(search), $options: "i" };

    const query = Category.find(filter).sort({ createdAt: -1 });
    const categories = all ? await query : await query.skip(skip).limit(limit);
    const total = await Category.countDocuments(filter);

    const counts = await Product.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    const data = categories.map((c) => ({
      ...c.toObject(),
      productCount: countMap.get(String(c._id)) || 0,
    }));

    return apiSuccess({ categories: data, meta: buildPaginationMeta(total, page, limit) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const data = categorySchema.parse(body);
    const slug = slugify(data.name);

    const existing = await Category.findOne({ slug });
    if (existing) {
      return apiError("A category with this name already exists", 409);
    }

    const rawSubcategories = data.subcategories || [];
    const subcategories = rawSubcategories.map((sub) => {
      if (typeof sub === "string") {
        const trimmed = sub.trim();
        return { name: trimmed, slug: slugify(trimmed) };
      }
      const trimmed = sub.name.trim();
      return {
        ...(sub._id ? { _id: sub._id } : {}),
        name: trimmed,
        slug: sub.slug ? slugify(sub.slug) : slugify(trimmed),
        description: sub.description || "",
      };
    });

    const category = await Category.create({ ...data, slug, subcategories });
    return apiSuccess(category, "Category created successfully", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
