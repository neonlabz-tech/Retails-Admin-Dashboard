import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-utils";
import { getPaginationParams, buildPaginationMeta } from "@/lib/utils";
import { notifyNewCustomer } from "@/lib/notify";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const verification = searchParams.get("verification") || "";
    const { page, limit, skip } = getPaginationParams(searchParams);

    const filter: Record<string, unknown> = {};
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { phone: { $regex: escapedSearch, $options: "i" } },
      ];
    }
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;
    if (status === "verified" || verification === "verified") filter.isVerified = true;
    if (status === "unverified" || verification === "unverified") filter.isVerified = false;

    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Customer.countDocuments(filter),
    ]);

    return apiSuccess({ customers, meta: buildPaginationMeta(total, page, limit) });
  } catch (err) {
    return handleApiError(err);
  }
}

const createCustomerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().default(""),
  isVerified: z.boolean().optional().default(false),
  addresses: z.array(z.record(z.string(), z.unknown())).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const data = createCustomerSchema.parse(body);

    const existing = await Customer.findOne({ email: data.email.toLowerCase() });
    if (existing) return apiError("A customer with this email already exists", 409);

    const customer = await Customer.create(data);
    await notifyNewCustomer(customer.name, customer.email);

    return apiSuccess(customer, "Customer created successfully", 201);
  } catch (err) {
    return handleApiError(err);
  }
}


