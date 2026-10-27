import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { apiSuccess, handleApiError } from "@/lib/api-utils";
import { getPaginationParams, buildPaginationMeta } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "";
    const unreadOnly =
      searchParams.get("unreadOnly") === "true" || searchParams.get("unread") === "true";
    const { page, limit, skip } = getPaginationParams(searchParams);

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;

    // Match both isRead: false and legacy read: false / missing flags
    const unreadCondition = {
      $or: [
        { isRead: false },
        { isRead: { $exists: false }, read: { $ne: true } },
        { isRead: null, read: { $ne: true } },
        { read: false },
      ],
    };

    if (unreadOnly) {
      filter.$and = [unreadCondition];
    }

    const unreadCountFilter: Record<string, unknown> = { ...unreadCondition };
    if (type) {
      unreadCountFilter.type = type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments(unreadCountFilter),
    ]);

    const normalized = (notifications as unknown as Array<Record<string, unknown>>).map((n) => ({
      ...n,
      isRead: Boolean(n.isRead === true || (n.isRead === undefined && n.read === true)),
    }));

    return apiSuccess({
      notifications: normalized,
      meta: buildPaginationMeta(total, page, limit),
      unreadCount,
    });
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
      const result = await Notification.updateMany(
        {},
        { $set: { isRead: true, read: true } }
      );
      return apiSuccess({ modifiedCount: result.modifiedCount }, "All notifications marked as read");
    }
    return apiSuccess(null, "No action taken");
  } catch (err) {
    return handleApiError(err);
  }
}
