import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Admin } from "@/models/Admin";
import { signResetToken, getSession } from "@/lib/auth";
import { sendEmail, emailTemplates } from "@/lib/email";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const session = await getSession();
    let email: string | undefined;

    try {
      const body = await request.json();
      email = body.email;
    } catch {
      // Body might be empty if called without payload
    }

    if (!email && session?.email) {
      email = session.email;
    }

    let admin = null;
    if (email) {
      admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    }
    if (!admin && session?.adminId) {
      admin = await Admin.findById(session.adminId);
    }

    if (!admin) {
      // Don't disclose whether an admin exists for security, return generic success
      return apiSuccess(null, "If an account exists with this email, a password reset link has been sent.");
    }

    if (!admin.isActive) {
      return apiError("This admin account is currently inactive.", 403);
    }

    const token = await signResetToken({
      adminId: admin.id,
      email: admin.email,
    });

    const origin =
      request.headers.get("origin") ||
      request.nextUrl.origin ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;

    console.log(`[forgot-password] Password reset link for ${admin.email}: ${resetUrl}`);

    const { sent, error } = await sendEmail({
      to: admin.email,
      subject: "Reset your RKF Admin password",
      html: emailTemplates.passwordReset(admin.name, resetUrl),
    });

    if (!sent && error) {
      console.warn(`[forgot-password] Email delivery note: ${error}`);
    }

    return apiSuccess(
      { resetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined },
      "Password reset link has been sent to your registered email."
    );
  } catch (err) {
    return handleApiError(err);
  }
}
