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

<<<<<<< Updated upstream
    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (unreadOnly) filter.isRead = false;
=======
    // Match both isRead: false and legacy read: false / missing flags
    const unreadCondition = {
      $or: [
        { isRead: false },
        { isRead: { $exists: false }, read: { $ne: true } },
        { isRead: null, read: { $ne: true } },
        { read: false },
      ],
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
>>>>>>> Stashed changes

    const filter: Record<string, unknown> = { $and: andConditions };
    const unreadCountFilter: Record<string, unknown> = { $and: unreadCountConditions };

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ isRead: false }),
    ]);

    return apiSuccess({ notifications, meta: buildPaginationMeta(total, page, limit), unreadCount });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
<<<<<<< Updated upstream
    const { action } = await request.json();
    if (action === "mark-all-read") {
      await Notification.updateMany({ isRead: false }, { isRead: true });
      return apiSuccess(null, "All notifications marked as read");
=======
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
>>>>>>> Stashed changes
    }
    return apiSuccess(null, "No action taken");
  } catch (err) {
    return handleApiError(err);
  }
}
