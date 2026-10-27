import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import "@/models/Category";
import { productSchema } from "@/lib/validators";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-utils";
import { slugify, getPaginationParams, buildPaginationMeta, escapeRegex } from "@/lib/utils";
import { getKeyFromUrl } from "@/lib/r2";
import { generateNextSku } from "@/lib/sku";
import { notifyLowStock } from "@/lib/notify";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const subcategory = searchParams.get("subcategory") || "";
    const status = searchParams.get("status") || "";
    const stockFilter = searchParams.get("stockFilter") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDir = searchParams.get("sortDir") === "asc" ? 1 : -1;
    const { page, limit, skip } = getPaginationParams(searchParams);

    const filter: Record<string, unknown> = {};
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { sku: { $regex: escaped, $options: "i" } },
        { tags: { $regex: escaped, $options: "i" } },
      ];
    }
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (status) filter.status = status;
    if (stockFilter === "out") filter.stock = { $lte: 0 };
    if (stockFilter === "low") {
      filter.$expr = { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }] };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    return apiSuccess({ products, meta: buildPaginationMeta(total, page, limit) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const data = productSchema.parse(body);

    let sku = data.sku.trim();
    if (!sku) {
      sku = await generateNextSku();
    }

    const existingSku = await Product.findOne({
      sku: { $regex: new RegExp(`^${escapeRegex(sku)}$`, "i") },
    });
    if (existingSku) return apiError("A product with this SKU already exists", 409);

    let slug = slugify(data.name);
    const slugExists = await Product.findOne({ slug });
    if (slugExists) slug = `${slug}-${Date.now().toString().slice(-5)}`;

    const imageKeys = (data.images || [])
      .map((img) => getKeyFromUrl(img))
      .filter((k): k is string => Boolean(k));

    const tags = Array.isArray(data.tags)
      ? data.tags.map((t) => String(t).trim()).filter(Boolean)
      : typeof data.tags === "string"
      ? (data.tags as string).split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const product = await Product.create({ ...data, tags, sku, slug, imageKeys });
    if (product.stock <= product.lowStockThreshold) {
      await notifyLowStock({ _id: product._id, name: product.name, stock: product.stock });
    }
    return apiSuccess(product, "Product created successfully", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
