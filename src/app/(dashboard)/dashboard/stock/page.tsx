"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boxes, AlertTriangle, XCircle, PackageCheck, SlidersHorizontal, ChevronDown, Check, X } from "lucide-react";
import { Button, Badge, Card, StatCard, Select, Input, Textarea } from "@/components/ui/primitives";
import { DataTable, type Column, Pagination, SearchInput } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { STOCK_LOG_TYPES } from "@/lib/constants";

interface StockProduct {
  _id: string;
  name: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  category: { name: string } | null;
}

const STOCK_FILTER_OPTIONS = [
  { key: "low", label: "Low stock" },
  { key: "out", label: "Out of stock" },
  { key: "in", label: "In stock" },
] as const;

export default function StockPage() {
  const toast = useToast();
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 10 });
  const [summary, setSummary] = useState({ totalStock: 0, outOfStock: 0, lowStock: 0 });

  const [adjustTarget, setAdjustTarget] = useState<StockProduct | null>(null);
  const [adjustType, setAdjustType] = useState<(typeof STOCK_LOG_TYPES)[number]>("increase");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (stockFilter) params.set("stockFilter", stockFilter);
      params.set("page", String(page));
      params.set("limit", "10");
      const res = await fetch(`/api/stock?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setProducts(json.data.products);
        setMeta(json.data.meta);
        setSummary(json.data.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [search, stockFilter, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function openAdjust(product: StockProduct) {
    setAdjustTarget(product);
    setAdjustType("increase");
    setQuantity("1");
    setReason("");
  }

  async function handleAdjust() {
    if (!adjustTarget) return;
    setSaving(true);
    try {
      const res = await fetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: adjustTarget._id, type: adjustType, quantity: Number(quantity), reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to adjust stock");
        return;
      }
      toast.success("Stock updated successfully");
      window.dispatchEvent(new Event("notifications-updated"));
      setAdjustTarget(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<StockProduct>[] = useMemo(
    () => [
      {
        header: "Product",
        key: "name",
        render: (p) => (
          <div>
            <p className="font-medium text-slate-800">{p.name}</p>
            <p className="text-xs text-slate-400">{p.sku}</p>
          </div>
        ),
      },
      { header: "Category", key: "category", render: (p) => p.category?.name || "-" },
      { header: "Current Stock", key: "stock", render: (p) => <span className="font-semibold text-slate-800">{p.stock}</span> },
      { header: "Low Stock Threshold", key: "lowStockThreshold" },
      {
        header: "Status",
        key: "status",
        render: (p) => (
          <Badge color={p.stock <= 0 ? "red" : p.stock <= p.lowStockThreshold ? "yellow" : "green"}>
            {p.stock <= 0 ? "Out of stock" : p.stock <= p.lowStockThreshold ? "Low stock" : "In stock"}
          </Badge>
        ),
      },
      {
        header: "Actions",
        key: "actions",
        render: (p) => (
          <Button size="sm" variant="outline" onClick={() => openAdjust(p)}>
            <SlidersHorizontal className="h-3.5 w-3.5" /> Adjust
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Stock &amp; Inventory</h1>
        <p className="mt-0.5 text-xs sm:text-sm text-slate-500">Monitor stock levels and record inventory adjustments.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Available Stock (units)" value={summary.totalStock} icon={<Boxes className="h-4.5 w-4.5" />} color="sky" />
        <StatCard label="Low Stock Products" value={summary.lowStock} icon={<AlertTriangle className="h-4.5 w-4.5" />} color="amber" />
        <StatCard label="Out of Stock Products" value={summary.outOfStock} icon={<XCircle className="h-4.5 w-4.5" />} color="rose" />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput className="flex-1 w-full" value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name or SKU..." />
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="relative">
              <select
                value={stockFilter}
                onChange={(e) => {
                  setStockFilter(e.target.value);
                  setPage(1);
                }}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3.5 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-xs transition cursor-pointer hover:border-slate-300"
              >
                <option value="">All statuses</option>
                {STOCK_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {stockFilter && (
              <button
                type="button"
                onClick={() => {
                  setStockFilter("");
                  setPage(1);
                }}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition shadow-xs"
                title="Reset stock filter"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <DataTable columns={columns} data={products} loading={loading} emptyTitle="No products found" emptyDescription="Adjust filters to see more results." />
        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
      </Card>

      <Modal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title={`Adjust stock — ${adjustTarget?.name || ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjustTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleAdjust} loading={saving}>
              <PackageCheck className="h-4 w-4" /> Apply adjustment
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">
            Current stock: <span className="font-semibold text-slate-800">{adjustTarget?.stock}</span> unit(s)
          </p>
          <Select label="Adjustment type" value={adjustType} onChange={(e) => setAdjustType(e.target.value as typeof adjustType)}>
            <option value="increase">Increase (restock)</option>
            <option value="decrease">Decrease (damage/loss)</option>
            <option value="return">Return (customer return)</option>
            <option value="sale">Sale (manual sale)</option>
            <option value="adjustment">Set exact quantity</option>
          </Select>
          <Input label={adjustType === "adjustment" ? "New quantity" : "Quantity"} type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <Textarea label="Reason / note" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Received new shipment from supplier" />
        </div>
      </Modal>
    </div>
  );
}
