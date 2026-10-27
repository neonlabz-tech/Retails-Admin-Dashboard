import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { apiError, apiSuccess, handleApiError } from "@/lib/api-utils";
import { z } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

const schema = z.object({ isRead: z.boolean() });

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const { isRead } = schema.parse(await request.json());
    const notification = await Notification.findByIdAndUpdate(
      id,
      { $set: { isRead, read: isRead } },
      { new: true }
    );
    if (!notification) return apiError("Notification not found", 404);
    return apiSuccess(notification, `Marked as ${isRead ? "read" : "unread"}`);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) return apiError("Notification not found", 404);
    return apiSuccess(null, "Notification deleted");
  } catch (err) {
    return handleApiError(err);
  }
}
