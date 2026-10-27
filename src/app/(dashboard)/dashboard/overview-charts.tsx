"use client";

import Image from "next/image";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#093b84",
  processing: "#093b84",
  shipped: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#f43f5e",
};

import { useState } from "react";
import Link from "next/link";
import { Calendar, Loader2, Package, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { Tooltip as UITooltip } from "@/components/ui/tooltip";

export function SalesTrendChart({
  data: propData,
  initialData,
}: {
  data?: { _id: string; sales: number; orders: number }[];
  initialData?: { _id: string; sales: number; orders: number }[];
}) {
  const [data, setData] = useState<{ _id: string; sales: number; orders: number }[]>(
    propData || initialData || []
  );
  const [range, setRange] = useState<string>("14");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  async function fetchRange(days: string) {
    setRange(days);
    if (days === "custom") return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stats?salesOnly=true&days=${days}`);
      const json = await res.json();
      if (json.success && json.data?.salesByDay) {
        setData(json.data.salesByDay);
      }
    } catch (err) {
      console.error("Failed to fetch sales trend", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/stats?salesOnly=true&startDate=${startDate}&endDate=${endDate}`
      );
      const json = await res.json();
      if (json.success && json.data?.salesByDay) {
        setData(json.data.salesByDay);
      }
    } catch (err) {
      console.error("Failed to fetch custom sales trend", err);
    } finally {
      setLoading(false);
    }
  }

  const rangeLabel =
    range === "7"
      ? "Last 7 days"
      : range === "14"
      ? "Last 14 days"
      : range === "30"
      ? "Last 30 days"
      : range === "90"
      ? "Last 90 days"
      : `${startDate} to ${endDate}`;

  return (
    <div className="flex flex-col">
      {/* Header controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-semibold text-slate-900">
            Sales Trend <span className="text-xs font-normal text-slate-500">({rangeLabel})</span>
          </h3>
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <span className="h-2 w-2 rounded-full bg-brand" />
            <span>Daily Sales</span>
          </div>
        </div>

        {/* Range preset buttons */}
        <div className="flex items-center gap-1">
          {[
            { key: "7", label: "7D" },
            { key: "14", label: "14D" },
            { key: "30", label: "30D" },
            { key: "90", label: "90D" },
            { key: "custom", label: "Custom" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => fetchRange(item.key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                range === item.key
                  ? "bg-brand text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {range === "custom" && (
        <form
          onSubmit={handleCustomSubmit}
          className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 text-xs"
        >
          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar className="h-3.5 w-3.5 text-brand" />
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand px-3 py-1 font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
          >
            {loading ? "Loading..." : "Apply Range"}
          </button>
        </form>
      )}

      {/* Chart container with loading overlay */}
      <div className="relative min-h-[280px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        )}

        {!data || data.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-slate-400">
            No sales recorded for this date range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#093b84" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#093b84" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="_id"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                interval={data.length > 30 ? Math.ceil(data.length / 8) : data.length > 14 ? 1 : 0}
                tickFormatter={(val) => {
                  try {
                    const parts = String(val).split("-");
                    if (parts.length === 3) {
                      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      const m = months[parseInt(parts[1], 10) - 1] || parts[1];
                      return `${m} ${parts[2]}`;
                    }
                    return val;
                  } catch {
                    return val;
                  }
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => {
                  const num = Number(val);
                  if (num === 0) return "0";
                  if (num >= 1_000_000) return `LKR ${(num / 1_000_000).toFixed(1)}M`;
                  if (num >= 1_000) return `LKR ${Math.round(num / 1_000)}k`;
                  return `LKR ${num}`;
                }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  fontSize: 12,
                }}
                labelFormatter={(label) => {
                  try {
                    const parts = String(label).split("-");
                    if (parts.length === 3) {
                      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      const m = months[parseInt(parts[1], 10) - 1] || parts[1];
                      return `${m} ${parts[2]}, ${parts[0]}`;
                    }
                    return label;
                  } catch {
                    return label;
                  }
                }}
                formatter={(value, name) => {
                  const num = typeof value === "number" ? value : Number(value || 0);
                  return [name === "sales" ? formatCurrency(num) : num, name === "sales" ? "Sales" : "Orders"];
                }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#093b84"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#093b84" }}
                fill="url(#colorSales)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function OrderStatusPieChart({ data }: { data: { status: string; count: number }[] }) {
  const filtered = data.filter((d) => d.count > 0);
  if (filtered.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-400">No orders yet</div>;
  }
  const total = filtered.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-[220px] w-full items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              dataKey="count"
              nameKey="status"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={4}
              stroke="none"
            >
              {filtered.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold tracking-tight text-slate-900">{total}</span>
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Orders</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
        {filtered.map((entry) => (
          <div key={entry.status} className="flex items-center gap-1.5 font-medium text-slate-600 capitalize">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[entry.status] || "#94a3b8" }}
            />
            <span>{entry.status}: <strong className="text-slate-800">{entry.count}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CategoryBarChart({ data }: { data: { name: string; productCount: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-400">No categories yet</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
        <Bar dataKey="productCount" fill="#093b84" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface StockBreakdownData {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  inStockPercent: number;
  lowStockPercent: number;
  outOfStockPercent: number;
  urgentItems?: Array<{
    _id: string;
    name: string;
    sku: string;
    stock: number;
    lowStockThreshold: number;
    images?: string[];
    price?: number;
  }>;
}

export function StockHealthCard({ data }: { data: StockBreakdownData }) {
  const { inStock, lowStock, outOfStock, inStockPercent, lowStockPercent, outOfStockPercent, urgentItems = [] } = data;

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Stock Overview & Alerts</h3>
            <p className="text-xs text-slate-500">Inventory ratio and items needing replenishment</p>
          </div>
          <Link
            href="/dashboard/stock"
            className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            Manage Stock <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Multi-segment Gauge */}
        <div className="mb-2">
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 flex">
            {inStockPercent > 0 && (
              <div
                style={{ width: `${inStockPercent}%` }}
                className="h-full bg-emerald-500 transition-all duration-300"
                title={`In Stock: ${inStock} (${inStockPercent}%)`}
              />
            )}
            {lowStockPercent > 0 && (
              <div
                style={{ width: `${lowStockPercent}%` }}
                className="h-full bg-amber-400 transition-all duration-300"
                title={`Low Stock: ${lowStock} (${lowStockPercent}%)`}
              />
            )}
            {outOfStockPercent > 0 && (
              <div
                style={{ width: `${outOfStockPercent}%` }}
                className="h-full bg-rose-500 transition-all duration-300"
                title={`Out of Stock: ${outOfStock} (${outOfStockPercent}%)`}
              />
            )}
          </div>
        </div>

        {/* Legend / Metrics */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Safe: <strong>{inStock}</strong> ({inStockPercent}%)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>Low: <strong>{lowStock}</strong> ({lowStockPercent}%)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>Out: <strong>{outOfStock}</strong> ({outOfStockPercent}%)</span>
          </div>
        </div>

        <div className="h-px bg-slate-100 my-3" />

        {/* Urgent Action List */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Urgent Restock Action
            </p>
            {urgentItems.length > 0 && (
              <span className="text-[11px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                {urgentItems.length} item(s) critical
              </span>
            )}
          </div>

          {urgentItems.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>All products have healthy inventory levels. No urgent restocks required.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {urgentItems.map((item) => (
                <div key={item._id} className="flex items-center justify-between py-2 gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 overflow-hidden"
                      title={item.name}
                    >
                      {item.images && item.images[0] ? (
                        <Image src={item.images[0]} alt={item.name} width={32} height={32} unoptimized className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <UITooltip content={item.name}>
                        <p className="truncate text-xs font-medium text-slate-800 hover:text-brand cursor-default transition-colors">
                          {item.name}
                        </p>
                      </UITooltip>
                      <p className="text-[11px] text-slate-400 truncate">SKU: {item.sku}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.stock <= 0 ? (
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 border border-rose-200">
                        Out of stock
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                        {item.stock} left (Low)
                      </span>
                    )}

                    <Link
                      href="/dashboard/stock"
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-brand hover:text-white transition-colors"
                    >
                      Restock
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
