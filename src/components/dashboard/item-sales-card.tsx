"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Search,
  ChevronDown,
  Package,
  Calendar,
  Layers,
  BarChart2,
  Loader2,
  FilterX,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

interface ItemSalesRecord {
  _id: string;
  name: string;
  image?: string;
  sku?: string;
  categoryName?: string;
  unitsSold: number;
  revenue: number;
  ordersCount: number;
}

interface CategoryOption {
  _id: string;
  name: string;
}

type DateRangeOption = "7" | "14" | "30" | "90" | "custom";
type MetricType = "units" | "revenue";

export function ItemSalesCard() {
  const [dateOption, setDateOption] = useState<DateRangeOption>("14");
  const [customStart, setCustomStart] = useState(() => {
    const past = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
    return past.toISOString().split("T")[0];
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [metric, setMetric] = useState<MetricType>("units");

  const [items, setItems] = useState<ItemSalesRecord[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateOption === "custom") {
        if (customStart) params.set("startDate", customStart);
        if (customEnd) params.set("endDate", customEnd);
      } else {
        params.set("days", dateOption);
      }
      if (selectedCategory && selectedCategory !== "all") {
        params.set("category", selectedCategory);
      }
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(`/api/dashboard/item-sales?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        if (json.data.categories && categories.length === 0) {
          setCategories(json.data.categories);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [dateOption, customStart, customEnd, selectedCategory, searchQuery, categories.length]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // Sort items according to active metric
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (metric === "units") {
        return b.unitsSold - a.unitsSold || b.revenue - a.revenue;
      }
      return b.revenue - a.revenue || b.unitsSold - a.unitsSold;
    });
  }, [items, metric]);

  const totalVolume = useMemo(() => {
    return sortedItems.reduce((acc, cur) => acc + cur.unitsSold, 0);
  }, [sortedItems]);

  const totalRevenue = useMemo(() => {
    return sortedItems.reduce((acc, cur) => acc + cur.revenue, 0);
  }, [sortedItems]);

  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header with Title and Metric Toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#093B84]/10 text-[#093B84]">
                <BarChart2 className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Item Sales Performance
                </h3>
                <p className="text-xs text-slate-500">
                  Product performance, unit volumes &amp; revenue metrics
                </p>
              </div>
            </div>
          </div>

          {/* Metric Toggle */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 self-start sm:self-auto shadow-inner">
            <button
              type="button"
              onClick={() => setMetric("units")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                metric === "units"
                  ? "bg-white text-[#093B84] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Package className="h-3.5 w-3.5" />
              Units Sold
            </button>
            <button
              type="button"
              onClick={() => setMetric("revenue")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                metric === "revenue"
                  ? "bg-white text-[#093B84] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span className="text-[11px] font-bold">LKR</span>
              Revenue
            </button>
          </div>
        </div>

        {/* Date Filter Pills */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 mr-1 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Range:
          </span>
          {(["7", "14", "30", "90"] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setDateOption(days)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-all",
                dateOption === days
                  ? "bg-[#093B84] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {days}D
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDateOption("custom")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-all",
              dateOption === "custom"
                ? "bg-[#093B84] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Custom
          </button>
        </div>

        {/* Custom Date Pickers (when Custom pill is active) */}
        {dateOption === "custom" && (
          <div className="mt-3 flex flex-wrap items-center gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/40 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-brand"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-brand"
              />
            </div>
          </div>
        )}

        {/* Filter Bar: Category Dropdown & Search Input */}
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product or SKU..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#093B84] focus:ring-1 focus:ring-[#093B84] transition"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3.5 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-[#093B84] focus:ring-1 focus:ring-[#093B84] shadow-xs transition cursor-pointer hover:border-slate-300"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* Ranked Items List */}
        <div className="mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#093B84]" />
              <span className="text-xs font-medium">Aggregating item performance...</span>
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-slate-50/60 border border-dashed border-slate-200">
              <FilterX className="h-8 w-8 text-slate-300 mb-1" />
              <p className="text-sm font-semibold text-slate-700">No sales recorded</p>
              <p className="text-xs text-slate-400 max-w-xs mt-0.5">
                No orders matched your selected period or filters. Try adjusting your range or category.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
              {sortedItems.map((item, idx) => {
                const rank = idx + 1;

                // Rank badge styling
                const badgeColor =
                  rank === 1
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : rank === 2
                    ? "bg-slate-200 text-slate-700 border-slate-300"
                    : rank === 3
                    ? "bg-amber-50 text-amber-900 border-amber-200"
                    : "bg-slate-100 text-slate-500 border-slate-200";

                return (
                  <div
                    key={item._id || item.sku || idx}
                    className="group rounded-xl border border-slate-100 bg-white p-3 hover:border-slate-300 hover:shadow-xs transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left side: Rank + Image + Name + Category */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold",
                            badgeColor
                          )}
                        >
                          #{rank}
                        </span>

                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              width={40}
                              height={40}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <Tooltip content={item.name}>
                            <p className="truncate text-xs font-semibold text-slate-900 leading-tight hover:text-[#093B84] transition-colors cursor-default">
                              {item.name}
                            </p>
                          </Tooltip>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                            {item.sku && <span>{item.sku}</span>}
                            {item.categoryName && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                                {item.categoryName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side: Primary metric + sub-metric */}
                      <div className="text-right shrink-0">
                        {metric === "units" ? (
                          <>
                            <p className="text-sm font-bold text-slate-900">
                              {item.unitsSold} <span className="text-xs font-normal text-slate-500">sold</span>
                            </p>
                            <p className="text-[11px] font-medium text-emerald-600">
                              {formatCurrency(item.revenue)}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-bold text-slate-900">
                              {formatCurrency(item.revenue)}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {item.unitsSold} units • {item.ordersCount} orders
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer summary stats */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-slate-400" />
          <span>{sortedItems.length} products listed</span>
        </span>
        <span className="flex items-center gap-2">
          <span>
            Total: <strong>{totalVolume}</strong> units
          </span>
          <span>•</span>
          <span className="text-emerald-700 font-semibold">
            {formatCurrency(totalRevenue)}
          </span>
        </span>
      </div>
    </div>
  );
}
