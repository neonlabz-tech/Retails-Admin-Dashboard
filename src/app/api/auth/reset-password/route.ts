import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Admin } from "@/models/Admin";
import { verifyResetToken, hashPassword } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token) {
      return apiError("Reset token is required", 400);
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return apiError("Password must be at least 6 characters long", 400);
    }

    const payload = await verifyResetToken(token);
    if (!payload || !payload.adminId) {
      return apiError("Invalid or expired password reset link. Please request a new one.", 400);
    }

    await connectDB();
    const admin = await Admin.findById(payload.adminId);
    if (!admin) {
      return apiError("Admin account not found", 404);
    }

    if (!admin.isActive) {
      return apiError("This admin account is currently inactive", 403);
    }

    admin.passwordHash = await hashPassword(password);
    await admin.save();

    return apiSuccess(null, "Password has been successfully updated. You can now sign in.");
  } catch (err) {
    return handleApiError(err);
  }
}
