import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Admin } from "@/models/Admin";
import { getSession, hashPassword, verifyPassword, signSessionToken, sessionCookieOptions } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-utils";
import { adminProfileSchema, changePasswordSchema } from "@/lib/validators";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);
    await connectDB();
    const admin = await Admin.findById(session.adminId);
    if (!admin) return apiError("Admin not found", 404);
    return apiSuccess({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      avatar: admin.avatar,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return apiError("Unauthorized", 401);
    await connectDB();
    const body = await request.json();

    const admin = await Admin.findById(session.adminId).select("+passwordHash");
    if (!admin) return apiError("Admin not found", 404);

    let passwordUpdated = false;
    let profileUpdated = false;

    if (body.currentPassword || body.newPassword) {
      const { currentPassword, newPassword } = changePasswordSchema.parse(body);
      const valid = await verifyPassword(currentPassword, admin.passwordHash);
      if (!valid) return apiError("Current password is incorrect", 400);
      admin.passwordHash = await hashPassword(newPassword);
      passwordUpdated = true;
    }

    if (body.name !== undefined || body.email !== undefined || body.avatar !== undefined) {
      const data = adminProfileSchema.parse({
        name: body.name ?? admin.name,
        email: body.email ?? admin.email,
        avatar: body.avatar ?? admin.avatar,
      });
      const newEmail = data.email.toLowerCase();
      if (newEmail !== admin.email.toLowerCase()) {
        const existing = await Admin.findOne({ email: newEmail, _id: { $ne: admin._id } });
        if (existing) {
          return apiError("This email is already in use by another account", 409);
        }
      }
      admin.name = data.name;
      admin.email = newEmail;
      admin.avatar = data.avatar ?? "";
      profileUpdated = true;
    }

    if (!passwordUpdated && !profileUpdated) {
      return apiError("No valid fields provided to update", 400);
    }

    await admin.save();

    const responseData = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      avatar: admin.avatar,
    };

    const message =
      passwordUpdated && profileUpdated
        ? "Profile and password updated successfully"
        : passwordUpdated
        ? "Password updated successfully"
        : "Profile updated successfully";

    const response = apiSuccess(responseData, message);

    if (profileUpdated) {
      const token = await signSessionToken({
        adminId: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      });
      response.cookies.set(sessionCookieOptions.name, token, sessionCookieOptions);
    }

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
