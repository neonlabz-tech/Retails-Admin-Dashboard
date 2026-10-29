import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Admin } from "@/models/Admin";
import { loginSchema } from "@/lib/validators";
import { apiError, handleApiError } from "@/lib/api-utils";
import { signSessionToken, verifyPassword, sessionCookieOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select("+passwordHash");
    if (!admin) {
      return apiError("Invalid email or password", 401);
    }
    if (!admin.isActive) {
      return apiError("This admin account has been deactivated", 403);
    }

    const validPassword = await verifyPassword(password, admin.passwordHash);
    if (!validPassword) {
      return apiError("Invalid email or password", 401);
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const token = await signSessionToken({
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      avatar: admin.avatar,
    });

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      data: {
        admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, avatar: admin.avatar },
      },
    });

    response.cookies.set(sessionCookieOptions.name, token, sessionCookieOptions);

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
