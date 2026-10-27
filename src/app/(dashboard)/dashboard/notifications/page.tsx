"use client";

import { useCallback, useEffect, useState } from "react";
<<<<<<< Updated upstream
import { Bell, CheckCheck, Trash2, PackageX, PackageMinus, ShoppingBag, UserPlus, CreditCard, RefreshCcw, Info } from "lucide-react";
=======
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
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
>>>>>>> Stashed changes
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

const ICONS: Record<NotificationType, React.ElementType> = {
  new_order: ShoppingBag,
  new_customer: UserPlus,
  low_stock: PackageMinus,
  out_of_stock: PackageX,
  payment_update: CreditCard,
  order_status: RefreshCcw,
  system: Info,
};

function getNotificationDestination(n: NotificationRow): { href: string; label: string } | null {
  // Check for order number in message or title (e.g. ORD-271026-1011)
  const orderMatch =
    n.message.match(/#?(ORD-[0-9A-Za-z-]+)/i) ||
    n.title.match(/#?(ORD-[0-9A-Za-z-]+)/i);
  const orderNum = orderMatch ? orderMatch[1].replace(/^#/, "") : "";

  if (n.type === "new_order" || n.type === "order_status" || orderNum) {
    const href = orderNum
      ? `/dashboard/orders?search=${encodeURIComponent(orderNum)}`
      : n.link || "/dashboard/orders";
    return {
      href,
      label: orderNum ? `View Order #${orderNum}` : "View Order",
    };
  }

  if (n.type === "new_customer") {
    return {
      href: n.link || "/dashboard/customers",
      label: "View Customer",
    };
  }

  if (n.type === "low_stock" || n.type === "out_of_stock") {
    return {
      href: n.link || "/dashboard/stock",
      label: "View Inventory",
    };
  }

  if (n.link) {
    return {
      href: n.link,
      label: "View Details",
    };
  }

  return null;
}

export default function NotificationsPage() {
  const toast = useToast();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 10 });

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
        setNotifications(json.data.notifications);
        setMeta(json.data.meta);
      }
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function markNotificationAsRead(n: NotificationRow) {
    if (n.isRead) return;

    // Optimistically mark as read in local state
    setNotifications((prev) =>
      prev.map((item) => (item._id === n._id ? { ...item, isRead: true } : item))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await fetch(`/api/notifications/${n._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      window.dispatchEvent(new Event("notifications-updated"));
    } catch {
      /* ignore */
    }
  }

  async function toggleRead(n: NotificationRow) {
    const res = await fetch(`/api/notifications/${n._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: !n.isRead }),
    });
    const json = await res.json();
    if (json.success) load();
  }

  async function remove(n: NotificationRow) {
    const res = await fetch(`/api/notifications/${n._id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Notification deleted");
      load();
    }
  }

  async function markAllRead() {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark-all-read" }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("All notifications marked as read");
      load();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">Stay on top of orders, stock alerts and customer activity.</p>
        </div>
        <Button variant="outline" onClick={markAllRead} className="shrink-0">
          <CheckCheck className="h-4 w-4" /> Mark all as read
        </Button>
      </div>

      <div className="flex gap-2">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-sm font-medium transition capitalize",
              filter === f ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <LoadingState />
        ) : notifications.length === 0 ? (
          <EmptyState icon={<Bell className="h-10 w-10" />} title="No notifications" description="You're all caught up!" />
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const Icon = ICONS[n.type] || Info;
<<<<<<< Updated upstream
=======
              const isUnread = !n.isRead;
              const destination = getNotificationDestination(n);
>>>>>>> Stashed changes
              return (
                <div key={n._id} className={cn("flex items-start gap-3 px-5 py-4", !n.isRead && "bg-brand/5")}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
<<<<<<< Updated upstream
                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                    <p className="text-sm text-slate-500">{n.message}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.createdAt)}</p>
=======
                    {destination ? (
                      <Link
                        href={destination.href}
                        onClick={() => markNotificationAsRead(n)}
                        className="group/link inline-flex items-center gap-1.5 hover:underline"
                      >
                        <p
                          className={cn(
                            "text-sm transition-colors group-hover/link:text-brand",
                            isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-800"
                          )}
                        >
                          {n.title}
                        </p>
                        <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover/link:text-brand transition-colors" />
                      </Link>
                    ) : (
                      <p
                        className={cn(
                          "text-sm",
                          isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-800"
                        )}
                      >
                        {n.title}
                      </p>
                    )}
                    <p className={cn("text-sm mt-0.5", isUnread ? "text-slate-700" : "text-slate-500")}>
                      {n.message}
                    </p>

                    {destination && (
                      <div className="mt-2.5">
                        <Link
                          href={destination.href}
                          onClick={() => markNotificationAsRead(n)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand/10 hover:bg-brand/20 text-brand px-3 py-1.5 text-xs font-bold transition shadow-2xs"
                        >
                          <span>{destination.label}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    )}

                    <p className={cn("mt-1.5 text-xs", isUnread ? "text-slate-500 font-medium" : "text-slate-400")}>
                      {formatDateTime(n.createdAt)}
                    </p>
>>>>>>> Stashed changes
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => toggleRead(n)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-brand/10"
                    >
                      {n.isRead ? "Mark unread" : "Mark read"}
                    </button>
                    <button onClick={() => remove(n)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500">
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
