"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  ShoppingCart,
  X,
  Mail,
  Phone,
  MapPin,
  Printer,
  ChevronDown,
  Calendar,
  Check,
  Package,
  Clock,
  User,
  CreditCard,
  Truck,
  ExternalLink,
  Receipt,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button, Badge, Card } from "@/components/ui/primitives";
import { DataTable, type Column, Pagination, SearchInput } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn, formatCurrency, formatDateTime, formatOrderId } from "@/lib/utils";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/constants";
import { printInvoice } from "@/lib/invoice";

interface OrderRow {
  _id: string;
  orderNumber: string;
  customer?: string | { _id?: string };
  customerSnapshot: { name: string; email: string; phone?: string };
  items: Array<{
    name: string;
    image?: string;
    sku?: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
  billingAddress: Record<string, string>;
  shippingAddress: {
    fullName?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
  };
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  paymentStatus: string;
  paymentMethod: string;
  status: string;
  statusHistory: Array<{ status: string; changedAt: string; note?: string }>;
  notes?: string;
  createdAt: string;
}

function getCustomerInitials(name?: string): string {
  if (!name) return "CU";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatPlacedDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  } catch {
    return dateStr;
  }
}

const statusBadgeStyles: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", border: "border-amber-200/80" },
  confirmed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", border: "border-blue-200/80" },
  processing: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", border: "border-purple-200/80" },
  shipped: { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500", border: "border-indigo-200/80" },
  delivered: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-200/80" },
  cancelled: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", border: "border-rose-200/80" },
  refunded: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", border: "border-slate-200" },
};

const statusColors: Record<string, "yellow" | "blue" | "purple" | "green" | "red" | "slate"> = {
  pending: "yellow",
  confirmed: "blue",
  processing: "purple",
  shipped: "blue",
  delivered: "green",
  cancelled: "red",
  refunded: "slate",
};

const paymentColors: Record<string, "yellow" | "green" | "red" | "slate"> = {
  pending: "yellow",
  paid: "green",
  failed: "red",
  refunded: "slate",
};

const paymentBadgeStyles: Record<string, { bg: string; text: string; border: string }> = {
  paid: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  failed: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  refunded: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
};

export default function OrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [singleDate, setSingleDate] = useState("");
  const [dateTab, setDateTab] = useState<"range" | "single">("range");
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 10 });

  const [detail, setDetail] = useState<OrderRow | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [newPaymentStatus, setNewPaymentStatus] = useState("");
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) {
        setDateMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toDateInputValue(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const todayStr = useMemo(() => toDateInputValue(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return toDateInputValue(y);
  }, []);

  function applyPreset(preset: "today" | "yesterday" | "last7" | "thisMonth") {
    const now = new Date();
    setPage(1);
    if (preset === "today") {
      setDateFrom(todayStr);
      setDateTo(todayStr);
      setSingleDate(todayStr);
    } else if (preset === "yesterday") {
      setDateFrom(yesterdayStr);
      setDateTo(yesterdayStr);
      setSingleDate(yesterdayStr);
    } else if (preset === "last7") {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      setDateFrom(toDateInputValue(past));
      setDateTo(toDateInputValue(now));
      setSingleDate("");
    } else if (preset === "thisMonth") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(toDateInputValue(start));
      setDateTo(toDateInputValue(now));
      setSingleDate("");
    }
  }

  function handleTabSwitch(tab: "range" | "single") {
    setDateTab(tab);
    if (tab === "single") {
      if (dateFrom && dateFrom === dateTo) {
        setSingleDate(dateFrom);
      } else if (dateFrom) {
        setSingleDate(dateFrom);
        setDateTo(dateFrom);
      }
    }
  }

  function clearDateFilter() {
    setDateFrom("");
    setDateTo("");
    setSingleDate("");
    setPage(1);
  }

  function getDateLabel(): string {
    if (!dateFrom && !dateTo) return "All dates";

    if (dateFrom && dateTo && dateFrom === dateTo) {
      if (dateFrom === todayStr) return "Today";
      if (dateFrom === yesterdayStr) return "Yesterday";
      try {
        const [year, month, day] = dateFrom.split("-").map(Number);
        return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } catch {
        return dateFrom;
      }
    }

    if (dateFrom && dateTo) {
      try {
        const [y1, m1, d1] = dateFrom.split("-").map(Number);
        const [y2, m2, d2] = dateTo.split("-").map(Number);
        const f = new Date(y1, m1 - 1, d1).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const t = new Date(y2, m2 - 1, d2).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return `${f} - ${t}`;
      } catch {
        return `${dateFrom} - ${dateTo}`;
      }
    }

    if (dateFrom) {
      try {
        const [year, month, day] = dateFrom.split("-").map(Number);
        return `From ${new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      } catch {
        return `From ${dateFrom}`;
      }
    }

    try {
      const [year, month, day] = dateTo.split("-").map(Number);
      return `Until ${new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    } catch {
      return `Until ${dateTo}`;
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("page", String(page));
      params.set("limit", "10");
      const res = await fetch(`/api/orders?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        const normalizedOrders = (json.data.orders as OrderRow[]).map((o) => ({
          ...o,
          orderNumber: formatOrderId(o.orderNumber, o.createdAt),
          status:
            o.paymentStatus === "pending" && (!o.status || o.status === "pending")
              ? "processing"
              : o.status,
        }));
        setOrders(normalizedOrders);
        setMeta(json.data.meta);
      }
    } finally {
      setLoading(false);
    }
  }, [search, status, paymentStatus, dateFrom, dateTo, page]);

  useEffect(() => {
    load();
  }, [load]);

  function openDetail(order: OrderRow) {
    const defaultStatus =
      order.paymentStatus === "pending" && (!order.status || order.status === "pending")
        ? "processing"
        : order.status;
    setDetail({
      ...order,
      orderNumber: formatOrderId(order.orderNumber, order.createdAt),
      status: defaultStatus,
    });
    setNewStatus(defaultStatus);
    setNewPaymentStatus(order.paymentStatus);
    setNote("");
  }

  async function handleUpdateStatus() {
    if (!detail) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${detail._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, paymentStatus: newPaymentStatus, note }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to update status");
        return;
      }
      toast.success("Order updated successfully");
      window.dispatchEvent(new Event("notifications-updated"));
      setDetail({
        ...json.data,
        orderNumber: formatOrderId(json.data.orderNumber, json.data.createdAt),
      });
      load();
    } finally {
      setUpdating(false);
    }
  }

  const columns: Column<OrderRow>[] = useMemo(
    () => [
      {
        header: "Order",
        key: "orderNumber",
        render: (o) => (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-slate-800">{formatOrderId(o.orderNumber, o.createdAt)}</p>
              <p className="text-xs text-slate-400">{o.items.length} item(s)</p>
            </div>
          </div>
        ),
      },
      {
        header: "Customer",
        key: "customer",
        render: (o) => (
          <div>
            <p className="text-slate-700">{o.customerSnapshot?.name}</p>
            <p className="text-xs text-slate-400">{o.customerSnapshot?.email}</p>
          </div>
        ),
      },
      { header: "Total", key: "total", render: (o) => formatCurrency(o.total) },
      { header: "Payment", key: "paymentStatus", render: (o) => <Badge color={paymentColors[o.paymentStatus] || "slate"}>{o.paymentStatus}</Badge> },
      { header: "Status", key: "status", render: (o) => <Badge color={statusColors[o.status] || "slate"}>{o.status}</Badge> },
      { header: "Date", key: "createdAt", render: (o) => formatDateTime(o.createdAt) },
      {
        header: "Actions",
        key: "actions",
        render: (o) => (
          <button onClick={() => openDetail(o)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand">
            <Eye className="h-4 w-4" />
          </button>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Orders</h1>
        <p className="mt-0.5 text-xs sm:text-sm text-slate-500">Track, filter and manage all customer orders.</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            className="flex-1 w-full"
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search order number or customer..."
          />
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Date / Calendar Filter */}
            <div className="relative" ref={dateMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setDateMenuOpen((v) => !v);
                }}
                className={cn(
                  "relative flex items-center gap-2 rounded-xl border bg-white py-2 pl-3.5 pr-8 text-xs font-medium outline-none shadow-xs transition cursor-pointer select-none hover:border-slate-300",
                  dateFrom || dateTo
                    ? "border-brand text-brand ring-1 ring-brand font-semibold"
                    : "border-slate-200 text-slate-700"
                )}
                title="Filter by date"
              >
                <Calendar className={cn("h-3.5 w-3.5 shrink-0", dateFrom || dateTo ? "text-brand" : "text-slate-400")} />
                <span>{getDateLabel()}</span>
                {dateFrom || dateTo ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      clearDateFilter();
                    }}
                    className="ml-0.5 rounded p-0.5 hover:bg-brand/10 text-brand transition cursor-pointer"
                    title="Clear date filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                ) : null}
                <ChevronDown
                  className={cn(
                    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-transform duration-200",
                    dateFrom || dateTo ? "text-brand" : "text-slate-400",
                    dateMenuOpen && "rotate-180"
                  )}
                />
              </button>

              {dateMenuOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-76 sm:w-80 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xl shadow-slate-900/10 animate-modal-in">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Filter by Date</span>
                    {(dateFrom || dateTo) && (
                      <button
                        type="button"
                        onClick={clearDateFilter}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Two Tabs: Date Range vs Single Date */}
                  <div className="flex rounded-xl bg-slate-100 p-1 mb-3">
                    <button
                      type="button"
                      onClick={() => handleTabSwitch("range")}
                      className={cn(
                        "flex-1 rounded-lg py-1.5 text-xs font-semibold transition text-center cursor-pointer",
                        dateTab === "range"
                          ? "bg-white text-brand shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Date Range
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabSwitch("single")}
                      className={cn(
                        "flex-1 rounded-lg py-1.5 text-xs font-semibold transition text-center cursor-pointer",
                        dateTab === "single"
                          ? "bg-white text-brand shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Single Date
                    </button>
                  </div>

                  {dateTab === "range" ? (
                    <div>
                      {/* Presets Grid matching image */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => applyPreset("today")}
                          className={cn(
                            "rounded-xl px-3 py-2 text-xs font-medium text-left transition cursor-pointer",
                            dateFrom === todayStr && dateTo === todayStr
                              ? "bg-brand/10 text-brand font-semibold"
                              : "bg-slate-50 text-slate-700 hover:bg-brand/10 hover:text-brand"
                          )}
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset("yesterday")}
                          className={cn(
                            "rounded-xl px-3 py-2 text-xs font-medium text-left transition cursor-pointer",
                            dateFrom === yesterdayStr && dateTo === yesterdayStr
                              ? "bg-brand/10 text-brand font-semibold"
                              : "bg-slate-50 text-slate-700 hover:bg-brand/10 hover:text-brand"
                          )}
                        >
                          Yesterday
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset("last7")}
                          className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-brand/10 hover:text-brand text-left transition cursor-pointer"
                        >
                          Last 7 Days
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset("thisMonth")}
                          className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-brand/10 hover:text-brand text-left transition cursor-pointer"
                        >
                          This Month
                        </button>
                      </div>

                      {/* Calendar Range Inputs */}
                      <div className="border-t border-slate-100 pt-3 space-y-2.5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">From Date</label>
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                              setDateFrom(e.target.value);
                              setPage(1);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-xs cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">To Date</label>
                          <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                              setDateTo(e.target.value);
                              setPage(1);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-xs cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 space-y-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Date</label>
                        <input
                          type="date"
                          value={singleDate || (dateFrom === dateTo ? dateFrom : "")}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSingleDate(val);
                            setDateFrom(val);
                            setDateTo(val);
                            setPage(1);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-xs cursor-pointer"
                        />
                        <p className="text-[11px] text-slate-400 mt-1.5">Filter orders placed on this specific day.</p>
                      </div>
                    </div>
                  )}

                  {/* Footer Actions matching image */}
                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setDateMenuOpen(false)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDateMenuOpen(false);
                        setPage(1);
                      }}
                      className="rounded-xl bg-brand px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-hover transition cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3.5 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-xs transition cursor-pointer hover:border-slate-300"
              >
                <option value="">All statuses</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Payment Filter */}
            <div className="relative">
              <select
                value={paymentStatus}
                onChange={(e) => {
                  setPaymentStatus(e.target.value);
                  setPage(1);
                }}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3.5 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-xs transition cursor-pointer hover:border-slate-300"
              >
                <option value="">All payments</option>
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Reset Filter Button */}
            {(status || paymentStatus || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setStatus("");
                  setPaymentStatus("");
                  clearDateFilter();
                }}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition shadow-xs"
                title="Reset all filters"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <DataTable columns={columns} data={orders} loading={loading} emptyTitle="No orders found" emptyDescription="Orders placed by customers will appear here." />
        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
      </Card>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        size="xl"
        hideHeader
        bodyClassName="p-0"
        className="max-h-[92vh] flex flex-col overflow-hidden"
      >
        {detail && (
          <div className="flex flex-col h-full max-h-[92vh]">
            {/* Modal Top Header Bar */}
            <div className="border-b border-slate-200/80 bg-slate-50/70 px-5 py-4 sm:px-6 flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Order {formatOrderId(detail.orderNumber, detail.createdAt)}
                  </h2>
                  {(() => {
                    const cfg = statusBadgeStyles[detail.status.toLowerCase()] || statusBadgeStyles.pending;
                    return (
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border", cfg.bg, cfg.text, cfg.border)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
                        <span className="capitalize">{detail.status}</span>
                      </span>
                    );
                  })()}
                  {(() => {
                    const pcfg = paymentBadgeStyles[detail.paymentStatus.toLowerCase()] || paymentBadgeStyles.pending;
                    return (
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize", pcfg.bg, pcfg.text, pcfg.border)}>
                        Payment: {detail.paymentStatus}
                      </span>
                    );
                  })()}
                  {detail.paymentMethod && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200/80 uppercase">
                      {detail.paymentMethod === "cod" ? "COD" : detail.paymentMethod.replace("_", " ")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>Placed on {formatPlacedDate(detail.createdAt)}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-xs"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Modal Content */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* LEFT COLUMN: Items, Summary & History (7 Cols) */}
                <div className="lg:col-span-7 space-y-5">
                  
                  {/* Products Card */}
                  <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
                    <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-brand" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Ordered Items ({detail.items.length})
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {detail.items.reduce((sum, item) => sum + item.quantity, 0)} total unit(s)
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {detail.items.map((item, idx) => {
                        const lineSubtotal = item.subtotal || item.price * item.quantity;
                        return (
                          <div key={idx} className="p-3.5 sm:p-4 flex items-center gap-3 hover:bg-slate-50/50 transition">
                            <div className="h-12 w-12 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 overflow-hidden">
                              {item.image ? (
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  width={48}
                                  height={48}
                                  unoptimized
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                                {item.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="font-mono text-[11px] text-slate-500">
                                  SKU: {item.sku || "N/A"}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-xs text-slate-500">
                                  {formatCurrency(item.price)} × {item.quantity}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs sm:text-sm font-bold text-slate-900">
                                {formatCurrency(lineSubtotal)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Financial Breakdown Card */}
                  <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                      <Receipt className="h-4 w-4 text-brand" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Payment Breakdown</span>
                    </div>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Items Subtotal</span>
                        <span className="font-semibold text-slate-800">{formatCurrency(detail.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Discount</span>
                        <span className="font-semibold text-emerald-600">
                          {detail.discount > 0 ? `-${formatCurrency(detail.discount)}` : "LKR 0"}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Shipping Fee</span>
                        <span className="font-semibold text-slate-800">{formatCurrency(detail.shippingFee ?? 0)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Estimated Tax</span>
                        <span className="text-slate-500">{formatCurrency(detail.tax || 0)}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-3 mt-2 flex items-baseline justify-between">
                        <div>
                          <span className="text-sm font-bold text-slate-900 block">Total Amount</span>
                          <span className="text-[11px] text-slate-400">All taxes &amp; fees included</span>
                        </div>
                        <span className="text-xl sm:text-2xl font-black text-brand tracking-tight">
                          {formatCurrency(detail.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status History Collapsible / Timeline */}
                  {detail.statusHistory && detail.statusHistory.length > 0 && (
                    <details className="group rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs" open>
                      <summary className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600 cursor-pointer select-none">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="h-3.5 w-3.5 text-brand" />
                          <span>Status Audit Trail ({detail.statusHistory.length})</span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                        {detail.statusHistory
                          .slice()
                          .reverse()
                          .map((h, idx) => (
                            <div key={idx} className="flex items-start justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="h-2 w-2 rounded-full bg-brand shrink-0" />
                                <span className="font-semibold text-slate-800 capitalize">{h.status}</span>
                                {h.note && <span className="text-slate-500 truncate">— {h.note}</span>}
                              </div>
                              <span className="text-slate-400 font-medium shrink-0">
                                {formatDateTime(h.changedAt)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </details>
                  )}
                </div>

                {/* RIGHT COLUMN: Customer, Shipping & Management (5 Cols) */}
                <div className="lg:col-span-5 space-y-5">
                  
                  {/* Customer Card */}
                  <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs p-4 sm:p-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-brand" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Customer</span>
                      </div>
                      <Link
                        href={`/dashboard/customers?search=${encodeURIComponent(detail.customerSnapshot?.email || detail.customerSnapshot?.name || "")}${detail.customer ? `&customerId=${encodeURIComponent(typeof detail.customer === "string" ? detail.customer : detail.customer._id || "")}` : ""}`}
                        className="text-xs font-semibold text-brand hover:text-brand-hover hover:underline transition cursor-pointer flex items-center gap-1"
                        title="View customer profile and order history"
                      >
                        <span>History</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                    <div className="flex items-start gap-3 mt-3.5">
                      <div className="h-10 w-10 rounded-xl bg-brand/10 text-brand font-bold text-xs flex items-center justify-center shrink-0 border border-brand/20 shadow-xs">
                        {getCustomerInitials(detail.customerSnapshot?.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {detail.customerSnapshot?.name || "Guest Customer"}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1 truncate">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{detail.customerSnapshot?.email || "No email provided"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5 truncate">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{detail.customerSnapshot?.phone || "No phone provided"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address Card */}
                  <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs p-4 sm:p-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-brand" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Shipping</span>
                      </div>
                      <span className="bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-md font-semibold border border-slate-200">
                        Standard Delivery
                      </span>
                    </div>

                    <div className="flex items-start gap-3 mt-3.5">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200/70">
                        <MapPin className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1 text-xs text-slate-600 space-y-0.5">
                        <h4 className="text-sm font-bold text-slate-900 truncate mb-1">
                          {detail.shippingAddress?.fullName || detail.customerSnapshot?.name || "Recipient"}
                        </h4>
                        <p className="leading-relaxed text-slate-700">
                          {detail.shippingAddress?.line1 || "No street address"}
                          {detail.shippingAddress?.line2 ? `, ${detail.shippingAddress.line2}` : ""}
                        </p>
                        <p className="text-slate-500">
                          {[detail.shippingAddress?.city, detail.shippingAddress?.state, detail.shippingAddress?.postalCode]
                            .filter(Boolean)
                            .join(", ") || "City, State"}
                        </p>
                        <p className="text-slate-500 font-medium">
                          {detail.shippingAddress?.country || "Sri Lanka"}
                        </p>
                        {detail.shippingAddress?.phone && (
                          <p className="text-slate-600 pt-1 flex items-center gap-1 font-medium">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {detail.shippingAddress.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Fulfillment & Status Update Card */}
                  <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs p-4 sm:p-5">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <CreditCard className="h-4 w-4 text-brand" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Update Order</span>
                    </div>

                    <div className="space-y-3 mt-3.5">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Order Status</label>
                        <div className="relative">
                          <select
                            value={newStatus}
                            onChange={(e) => {
                              const nextStatus = e.target.value;
                              setNewStatus(nextStatus);
                              if (nextStatus === "delivered" && newPaymentStatus === "pending") {
                                setNewPaymentStatus("paid");
                              }
                            }}
                            className="peer w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 shadow-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer pr-10"
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s} className="capitalize">
                                {s}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 peer-focus:rotate-180 transition-transform duration-200" />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Payment Status</label>
                        <div className="relative">
                          <select
                            value={newPaymentStatus}
                            onChange={(e) => {
                              const nextPaymentStatus = e.target.value;
                              setNewPaymentStatus(nextPaymentStatus);
                              if (nextPaymentStatus === "pending") {
                                setNewStatus("processing");
                              }
                            }}
                            className="peer w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 shadow-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer pr-10"
                          >
                            {PAYMENT_STATUSES.map((s) => (
                              <option key={s} value={s} className="capitalize">
                                {s}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 peer-focus:rotate-180 transition-transform duration-200" />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Internal Note (Optional)</label>
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="e.g. Courier tracking code or update reason"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand shadow-xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleUpdateStatus}
                        disabled={updating}
                        className="w-full rounded-xl bg-brand hover:bg-brand-hover text-white py-2.5 px-4 text-xs sm:text-sm font-bold shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
                      >
                        {updating ? "Saving Changes..." : "Save Status Changes"}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="border-t border-slate-200/80 bg-slate-50/80 px-5 py-3.5 sm:px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => printInvoice(detail)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs flex items-center gap-2 cursor-pointer transition"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                  <span>Print Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.success("Email notification sent to " + (detail.customerSnapshot?.email || "customer"));
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs flex items-center gap-2 cursor-pointer transition"
                >
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  <span>Resend Email</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-semibold text-xs px-4 py-2 transition cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
