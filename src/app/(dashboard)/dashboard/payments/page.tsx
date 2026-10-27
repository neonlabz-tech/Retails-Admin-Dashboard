"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, Eye, ChevronDown, Check, X } from "lucide-react";
import { Button, Badge, Card, Select } from "@/components/ui/primitives";
import { DataTable, type Column, Pagination, SearchInput } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDateTime, formatOrderId, cn } from "@/lib/utils";
import { PAYMENT_METHODS, PAYMENT_RECORD_STATUSES } from "@/lib/constants";

interface PaymentRow {
  _id: string;
  orderNumber: string;
  customer: { name: string; email: string } | null;
  order?: { customerSnapshot?: { name: string; email: string } } | null;
  amount: number;
  method: string;
  status: string;
  transactionId?: string;
  gateway: string;
  paidAt?: string;
  createdAt: string;
}

const statusColors: Record<string, "yellow" | "green" | "red" | "slate"> = {
  pending: "yellow",
  completed: "green",
  cancelled: "red",
  failed: "red",
  refunded: "slate",
};

export default function PaymentsPage() {
  const toast = useToast();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 10 });
  const [detail, setDetail] = useState<PaymentRow | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (method) params.set("method", method);
      params.set("page", String(page));
      params.set("limit", "10");
      const res = await fetch(`/api/payments?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        const normalized = (json.data.payments as PaymentRow[]).map((p) =>
          p.status === "failed" ? { ...p, status: "cancelled" } : p
        );
        setPayments(normalized);
        setMeta(json.data.meta);
      }
    } finally {
      setLoading(false);
    }
  }, [search, status, method, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function openDetail(payment: PaymentRow) {
    const normalizedStatus = payment.status === "failed" ? "cancelled" : payment.status;
    setDetail({ ...payment, status: normalizedStatus });
    setNewStatus(normalizedStatus);
    setTransactionId(payment.transactionId || "");
  }

  async function handleUpdate() {
    if (!detail) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/payments/${detail._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, transactionId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to update payment");
        return;
      }
      toast.success("Payment updated successfully");
      setDetail(null);
      load();
    } finally {
      setUpdating(false);
    }
  }

  const columns: Column<PaymentRow>[] = useMemo(
    () => [
      {
        header: "Order",
        key: "orderNumber",
        render: (p) => (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
              <CreditCard className="h-4 w-4" />
            </div>
            <span className="font-medium text-slate-800">{formatOrderId(p.orderNumber, p.createdAt)}</span>
          </div>
        ),
      },
      { header: "Customer", key: "customer", render: (p) => p.customer?.name || p.order?.customerSnapshot?.name || "-" },
      { header: "Amount", key: "amount", render: (p) => formatCurrency(p.amount) },
      { header: "Method", key: "method", render: (p) => <Badge color="blue">{p.method.replace("_", " ")}</Badge> },
      { header: "Status", key: "status", render: (p) => <Badge color={statusColors[p.status] || "slate"}>{p.status}</Badge> },
      { header: "Date", key: "createdAt", render: (p) => formatDateTime(p.createdAt) },
      {
        header: "Actions",
        key: "actions",
        render: (p) => (
          <button onClick={() => openDetail(p)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand">
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
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Payments</h1>
        <p className="mt-0.5 text-xs sm:text-sm text-slate-500">Track payment status and transaction details for every order.</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput className="flex-1 w-full" value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search order number or transaction ID..." />
          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                {PAYMENT_RECORD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Method Filter */}
            <div className="relative">
              <select
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value);
                  setPage(1);
                }}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3.5 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-xs transition cursor-pointer hover:border-slate-300"
              >
                <option value="">All methods</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace("_", " ").charAt(0).toUpperCase() + m.replace("_", " ").slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Reset Filter Button */}
            {(status || method) && (
              <button
                type="button"
                onClick={() => {
                  setStatus("");
                  setMethod("");
                  setPage(1);
                }}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition shadow-xs"
                title="Reset filters"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <DataTable columns={columns} data={payments} loading={loading} emptyTitle="No payments found" emptyDescription="Payment records will appear here once orders are placed." />
        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
      </Card>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Payment — ${formatOrderId(detail.orderNumber, detail.createdAt)}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetail(null)}>
              Close
            </Button>
            <Button onClick={handleUpdate} loading={updating}>
              Save changes
            </Button>
          </>
        }
      >
        {detail && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Amount</p>
                <p className="font-semibold text-slate-800">{formatCurrency(detail.amount)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Gateway</p>
                <p className="font-semibold capitalize text-slate-800">{detail.gateway}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Customer</p>
                <p className="font-semibold text-slate-800">{detail.customer?.name || detail.order?.customerSnapshot?.name || "-"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Paid at</p>
                <p className="font-semibold text-slate-800">{detail.paidAt ? formatDateTime(detail.paidAt) : "Not paid yet"}</p>
              </div>
            </div>
            <Select label="Payment status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              {PAYMENT_RECORD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Transaction ID</label>
              <input
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. txn_1234567890"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
