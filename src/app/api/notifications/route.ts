import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Notification, ADMIN_NOTIFICATION_CONDITIONS } from "@/models/Notification";
import { apiSuccess, handleApiError } from "@/lib/api-utils";
import { getPaginationParams, buildPaginationMeta } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "";
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const { page, limit, skip } = getPaginationParams(searchParams);

    // Unread if neither isRead nor legacy read flag is true
    const unreadCondition = {
      isRead: { $ne: true },
      read: { $ne: true },
    };

    // Filter strictly for admin notifications (excludes customer-facing notifications)
    const andConditions: Array<Record<string, unknown>> = [...ADMIN_NOTIFICATION_CONDITIONS];

    if (type) {
      andConditions.push({ type });
    }

    const unreadCountConditions = [...andConditions, unreadCondition];

    if (unreadOnly) {
      andConditions.push(unreadCondition);
    }

    const filter: Record<string, unknown> = { $and: andConditions };
    const unreadCountFilter: Record<string, unknown> = { $and: unreadCountConditions };

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments(unreadCountFilter),
    ]);

    return apiSuccess({ notifications, meta: buildPaginationMeta(total, page, limit), unreadCount });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    let action = "mark-all-read";
    try {
      const body = await request.json();
      if (body && body.action) action = body.action;
    } catch {
      // Default to mark-all-read if no body passed
    }

    if (action === "mark-all-read" || action === "mark_all_read") {
      // Only mark admin-facing notifications as read; customer notifications remain untouched
      const result = await Notification.updateMany(
        { $and: ADMIN_NOTIFICATION_CONDITIONS },
        { $set: { isRead: true, read: true } }
      );
      return apiSuccess({ modifiedCount: result.modifiedCount }, "All notifications marked as read");
    }
    return apiSuccess(null, "No action taken");
  } catch (err) {
    return handleApiError(err);
  }
}
