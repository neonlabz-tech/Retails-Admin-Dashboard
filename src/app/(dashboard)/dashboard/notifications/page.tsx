"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Trash2,
  PackageX,
  PackageMinus,
  ShoppingBag,
  UserPlus,
  CreditCard,
  RefreshCcw,
  PackageCheck,
  Truck,
  Info,
} from "lucide-react";
import { Button, Card, EmptyState, LoadingState } from "@/components/ui/primitives";
import { Pagination } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, cn } from "@/lib/utils";
import type { NotificationType } from "@/lib/constants";

interface NotificationRow {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

const ICONS: Record<string, React.ElementType> = {
  new_order: ShoppingBag,
  new_customer: UserPlus,
  low_stock: PackageMinus,
  out_of_stock: PackageX,
  payment_update: CreditCard,
  order_status: RefreshCcw,
  order_delivered: PackageCheck,
  order_update: Truck,
  general: Info,
  system: Info,
};

export default function NotificationsPage() {
  const toast = useToast();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 10 });
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "unread") params.set("unreadOnly", "true");
      params.set("page", String(page));
      params.set("limit", "10");
      const res = await fetch(`/api/notifications?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data.notifications || []);
        setMeta(json.data.meta || { total: 0, totalPages: 1, limit: 10 });
        setUnreadCount(json.data.unreadCount ?? 0);
      }
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [filter, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleRead(n: NotificationRow) {
    const nextRead = !n.isRead;
    // Optimistic update
    setNotifications((prev) =>
      prev.map((item) => (item._id === n._id ? { ...item, isRead: nextRead } : item))
    );
    setUnreadCount((prev) => Math.max(0, prev + (nextRead ? -1 : 1)));

    try {
      const res = await fetch(`/api/notifications/${n._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: nextRead }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to update notification");
        load();
        return;
      }
      window.dispatchEvent(new Event("notifications-updated"));
      load();
    } catch {
      toast.error("Failed to update notification");
      load();
    }
  }

  async function remove(n: NotificationRow) {
    try {
      const res = await fetch(`/api/notifications/${n._id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to delete notification");
        return;
      }
      toast.success("Notification deleted");
      window.dispatchEvent(new Event("notifications-updated"));
      if (notifications.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        load();
      }
    } catch {
      toast.error("Failed to delete notification");
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    // Optimistically mark all in view as read
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-all-read" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to mark notifications as read");
        load();
        return;
      }
      toast.success("All notifications marked as read");
      window.dispatchEvent(new Event("notifications-updated"));
      load();
    } catch {
      toast.error("Failed to mark notifications as read");
      load();
    } finally {
      setMarkingAll(false);
    }
  }

  const hasUnread = unreadCount > 0 || notifications.some((n) => !n.isRead);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">Stay on top of orders, stock alerts and customer activity.</p>
        </div>
        <Button
          variant="outline"
          onClick={markAllRead}
          disabled={!hasUnread || markingAll}
          className="shrink-0"
        >
          <CheckCheck className="h-4 w-4" />
          {markingAll ? "Marking..." : "Mark all as read"}
        </Button>
      </div>

      <div className="flex gap-2">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition capitalize cursor-pointer",
              filter === f
                ? "bg-brand text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
            )}
          >
            <span>{f}</span>
            {f === "unread" && unreadCount > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none",
                  filter === "unread" ? "bg-white text-brand" : "bg-brand text-white"
                )}
              >
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <LoadingState />
        ) : notifications.length === 0 ? (
          <EmptyState icon={<Bell className="h-10 w-10" />} title="No notifications" description="You're all caught up!" />
        ) : (
          <div className="divide-y divide-slate-200/70">
            {notifications.map((n) => {
              const Icon = ICONS[n.type] || Info;
              const isUnread = !n.isRead;
              return (
                <div
                  key={n._id}
                  className={cn(
                    "flex items-start gap-3 px-5 py-4 transition-colors",
                    isUnread ? "bg-[#d6e4f9]/85 border-l-4 border-l-brand" : "bg-white"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      isUnread ? "bg-brand text-white shadow-xs" : "bg-brand/10 text-brand"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {n.link ? (
                      <Link href={n.link} className="hover:underline">
                        <p className={cn("text-sm", isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-800")}>
                          {n.title}
                        </p>
                      </Link>
                    ) : (
                      <p className={cn("text-sm", isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-800")}>
                        {n.title}
                      </p>
                    )}
                    <p className={cn("text-sm", isUnread ? "text-slate-700" : "text-slate-500")}>{n.message}</p>
                    <p className={cn("mt-1 text-xs", isUnread ? "text-slate-500 font-medium" : "text-slate-400")}>
                      {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => toggleRead(n)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-brand/10 cursor-pointer"
                    >
                      {n.isRead ? "Mark unread" : "Mark read"}
                    </button>
                    <button onClick={() => remove(n)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 cursor-pointer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
      </Card>
    </div>
  );
}
