"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
  Check,
  Calendar,
  Layers,
  Banknote,
  TrendingUp,
  Receipt,
  FileText,
  X,
} from "lucide-react";
import { Card, Button, Input, Select, LoadingState, Badge } from "@/components/ui/primitives";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

interface BestSellingProduct {
  name: string;
  unitsSold: number;
  revenue: number;
  percentage: number;
  color: string;
}

interface ExpenseCategoryItem {
  category: string;
  amount: number;
  percentage: number;
  color: string;
  count: number;
}

interface TimelinePoint {
  date: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface ProfitApiResponse {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: string;
    paidOrdersCount: number;
  };
  bestSelling: {
    totalSold: number;
    products: BestSellingProduct[];
  };
  expenses: {
    total: number;
    categories: ExpenseCategoryItem[];
  };
  timeline: TimelinePoint[];
}

interface ExpenseRow {
  _id: string;
  title: string;
  description?: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt: string;
}

const CATEGORY_STYLE_MAP: Record<
  string,
  { bg: string; text: string; border: string; dot: string }
> = {
  "Salaries & Payroll": {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  "Operations & Logistics": {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    dot: "bg-indigo-500",
  },
  "Taxes & Compliance": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  "Marketing & Ads": {
    bg: "bg-pink-50",
    text: "text-pink-700",
    border: "border-pink-200",
    dot: "bg-pink-500",
  },
  "Utilities & Rent": {
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
    dot: "bg-cyan-500",
  },
  "Packaging & Supplies": {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  Other: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-500",
  },
};

const TIMEFRAME_OPTIONS = [
  { key: "this-week", label: "This Week" },
  { key: "this-month", label: "This Month" },
  { key: "this-year", label: "This Year" },
];

function TimeframeDropdown({
  value,
  startDate,
  endDate,
  onChange,
}: {
  value: string;
  startDate?: string;
  endDate?: string;
  onChange: (val: string, customRange?: { startDate: string; endDate: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(value === "custom");
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [tempStart, setTempStart] = useState(startDate || todayStr);
  const [tempEnd, setTempEnd] = useState(endDate || todayStr);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (startDate) setTempStart(startDate);
    if (endDate) setTempEnd(endDate);
    setIsCustomMode(value === "custom");
  }, [startDate, endDate, value, open]);

  const currentLabel = useMemo(() => {
    if (value === "custom") {
      if (startDate && endDate) {
        try {
          const s = new Date(startDate);
          const e = new Date(endDate);
          const sStr = s.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const eStr = e.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return `${sStr} – ${eStr}`;
        } catch {
          return "Custom";
        }
      }
      return "Custom";
    }
    return TIMEFRAME_OPTIONS.find((t) => t.key === value)?.label || "This Month";
  }, [value, startDate, endDate]);

  function handleApplyCustom() {
    if (!tempStart || !tempEnd) return;
    let s = tempStart;
    let e = tempEnd;
    if (s > e) {
      [s, e] = [e, s];
      setTempStart(s);
      setTempEnd(e);
    }
    onChange("custom", { startDate: s, endDate: e });
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex items-center justify-between gap-2 rounded-xl border bg-white py-2 pl-3.5 pr-8 text-xs font-medium shadow-xs transition cursor-pointer select-none hover:border-slate-300",
          value === "custom"
            ? "border-brand text-brand ring-1 ring-brand font-semibold"
            : "border-slate-200 text-slate-700"
        )}
      >
        <span>{currentLabel}</span>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
            value === "custom" && "text-brand",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 animate-modal-in">
          {/* Preset Buttons */}
          <div className="space-y-0.5">
            {TIMEFRAME_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setIsCustomMode(false);
                  onChange(opt.key);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-left transition cursor-pointer",
                  value === opt.key && !isCustomMode
                    ? "bg-brand/10 text-brand font-semibold"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <span>{opt.label}</span>
                {value === opt.key && !isCustomMode && <Check className="h-3 w-3 text-brand" />}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setIsCustomMode(true)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-left transition cursor-pointer",
                isCustomMode
                  ? "bg-brand/10 text-brand font-semibold"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Custom
              </span>
              {isCustomMode && <Check className="h-3 w-3 text-brand" />}
            </button>
          </div>

          {/* Custom Date Inputs */}
          {isCustomMode && (
            <div className="mt-2 border-t border-slate-100 pt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 outline-none focus:border-brand focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 outline-none focus:border-brand focus:bg-white"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(false);
                    setOpen(false);
                  }}
                  className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCustom}
                  className="rounded-md bg-brand px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryFilterDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (cat: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3.5 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-xs transition cursor-pointer hover:border-slate-300"
      >
        <option value="all">All Categories</option>
        {EXPENSE_CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
    </div>
  );
}

// Custom Tooltip for the Revenue Generated chart
function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    const rev = payload.find((p) => p.name === "Revenue")?.value || 0;
    const exp = payload.find((p) => p.name === "Expenses")?.value || 0;
    const net = rev - exp;

    return (
      <div className="rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-xl backdrop-blur-md text-xs">
        <p className="font-semibold text-slate-800 mb-1.5 border-b border-slate-100 pb-1">
          {label}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-[#093b84]" />
              Revenue:
            </span>
            <span className="font-semibold text-slate-900">{formatCurrency(rev)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
              Expenses:
            </span>
            <span className="font-semibold text-slate-900">{formatCurrency(exp)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1 mt-1">
            <span className="font-medium text-slate-600">Net Profit:</span>
            <span
              className={cn(
                "font-bold",
                net >= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {formatCurrency(net)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

// Custom Tooltip for Best Selling Products Pie / Donut Chart
function BestSellingTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    payload?: BestSellingProduct;
  }>;
}) {
  if (active && payload && payload.length) {
    const raw = payload[0]?.payload;
    const name = raw?.name || payload[0]?.name || "";
    if (!name || name === "No Sales") return null;

    const unitsSold = raw?.unitsSold ?? (typeof payload[0]?.value === "number" ? payload[0].value : 0);
    const percentage = raw?.percentage;
    const revenue = raw?.revenue ?? 0;
    const color = raw?.color || payload[0]?.color || "#10b981";

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl text-xs min-w-[175px] z-50">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5 mb-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="font-semibold text-slate-800 truncate" title={name}>
            {name}
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-slate-600">
            <span>Units Sold:</span>
            <span className="font-semibold text-slate-900">
              {unitsSold} {unitsSold === 1 ? "unit" : "units"}
            </span>
          </div>
          {typeof percentage === "number" && (
            <div className="flex items-center justify-between gap-3 text-slate-600">
              <span>Share:</span>
              <span className="font-semibold text-slate-900">{percentage}%</span>
            </div>
          )}
          {revenue > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-1 mt-1 text-slate-600">
              <span>Revenue:</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(revenue)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

// Custom Tooltip for Expenses by Category Pie Chart
function ExpenseCategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    payload?: ExpenseCategoryItem;
  }>;
}) {
  if (active && payload && payload.length) {
    const raw = payload[0]?.payload;
    const category = raw?.category || payload[0]?.name || "";
    if (!category || category === "No Expenses") return null;

    const amount = raw?.amount ?? (typeof payload[0]?.value === "number" ? payload[0].value : 0);
    const percentage = raw?.percentage;
    const color = raw?.color || payload[0]?.color || "#6366f1";

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl text-xs min-w-[175px] z-50">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5 mb-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="font-semibold text-slate-800 truncate" title={category}>
            {category}
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-slate-600">
            <span>Amount:</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(amount)}
            </span>
          </div>
          {typeof percentage === "number" && (
            <div className="flex items-center justify-between gap-3 text-slate-600">
              <span>Share:</span>
              <span className="font-semibold text-slate-900">{percentage}%</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export default function ProfitExpensesPage() {
  const toast = useToast();

  // Timeframe states for the 3 visual cards
  const [bestSellingTimeframe, setBestSellingTimeframe] = useState("this-month");
  const [bestSellingCustomStart, setBestSellingCustomStart] = useState("");
  const [bestSellingCustomEnd, setBestSellingCustomEnd] = useState("");
  const [bestSellingHovered, setBestSellingHovered] = useState(false);

  const [expensesTimeframe, setExpensesTimeframe] = useState("this-month");
  const [expensesCustomStart, setExpensesCustomStart] = useState("");
  const [expensesCustomEnd, setExpensesCustomEnd] = useState("");

  const [revenueTimeframe, setRevenueTimeframe] = useState("this-week");
  const [revenueCustomStart, setRevenueCustomStart] = useState("");
  const [revenueCustomEnd, setRevenueCustomEnd] = useState("");

  // Main profit metrics API data
  const [profitData, setProfitData] = useState<ProfitApiResponse | null>(null);
  const [profitLoading, setProfitLoading] = useState(true);

  // Expenses table state
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expensePage, setExpensePage] = useState(1);
  const [expenseMeta, setExpenseMeta] = useState({ total: 0, totalPages: 1, limit: 5 });
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");

  // Add Expense Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newNotes, setNewNotes] = useState("");

  // View Expense Modal state
  const [viewExpense, setViewExpense] = useState<ExpenseRow | null>(null);

  // Edit Expense Modal state
  const [editTarget, setEditTarget] = useState<ExpenseRow | null>(null);
  const [updatingExpense, setUpdatingExpense] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Warning Dialog Delete state
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load profit analytics data
  const loadProfitData = useCallback(async () => {
    setProfitLoading(true);
    try {
      const params = new URLSearchParams({
        timeframe: revenueTimeframe,
        bestSellingTimeframe,
        expensesTimeframe,
      });

      if (revenueTimeframe === "custom" && revenueCustomStart && revenueCustomEnd) {
        params.set("startDate", revenueCustomStart);
        params.set("endDate", revenueCustomEnd);
      }
      if (bestSellingTimeframe === "custom" && bestSellingCustomStart && bestSellingCustomEnd) {
        params.set("bestSellingStartDate", bestSellingCustomStart);
        params.set("bestSellingEndDate", bestSellingCustomEnd);
      }
      if (expensesTimeframe === "custom" && expensesCustomStart && expensesCustomEnd) {
        params.set("expensesStartDate", expensesCustomStart);
        params.set("expensesEndDate", expensesCustomEnd);
      }

      const res = await fetch(`/api/profit?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setProfitData(json.data);
      }
    } catch {
      toast.error("Failed to load profit calculations");
    } finally {
      setProfitLoading(false);
    }
  }, [
    revenueTimeframe,
    revenueCustomStart,
    revenueCustomEnd,
    bestSellingTimeframe,
    bestSellingCustomStart,
    bestSellingCustomEnd,
    expensesTimeframe,
    expensesCustomStart,
    expensesCustomEnd,
    toast,
  ]);

  // Load expenses table data
  const loadExpenses = useCallback(async () => {
    setExpensesLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(expensePage),
        limit: "5",
      });
      if (expenseCategoryFilter && expenseCategoryFilter !== "all") {
        params.set("category", expenseCategoryFilter);
      }
      const res = await fetch(`/api/expenses?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setExpenses(json.data.expenses);
        setExpenseMeta(json.data.meta);
      }
    } catch {
      toast.error("Failed to load expenses list");
    } finally {
      setExpensesLoading(false);
    }
  }, [expensePage, expenseCategoryFilter, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfitData();
  }, [loadProfitData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadExpenses();
  }, [loadExpenses]);

  // Handle Add Expense Submit
  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    const num = Number(newAmount);
    if (isNaN(num) || num <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    setSubmittingExpense(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          category: newCategory,
          amount: num,
          date: newDate,
          notes: newNotes.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to add expense");
        return;
      }
      toast.success("Expense added successfully");
      setAddModalOpen(false);
      // Reset form
      setNewTitle("");
      setNewDescription("");
      setNewCategory(EXPENSE_CATEGORIES[0]);
      setNewAmount("");
      setNewNotes("");
      // Reload both
      loadExpenses();
      loadProfitData();
    } catch {
      toast.error("Something went wrong while saving expense");
    } finally {
      setSubmittingExpense(false);
    }
  }

  function openEditModal(exp: ExpenseRow) {
    setEditTarget(exp);
    setEditTitle(exp.title);
    setEditDescription(exp.description || "");
    setEditCategory(exp.category || EXPENSE_CATEGORIES[0]);
    setEditAmount(String(exp.amount));
    setEditDate(
      exp.date ? new Date(exp.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
    );
    setEditNotes(exp.notes || "");
  }

  async function handleUpdateExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    if (!editTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    const num = Number(editAmount);
    if (isNaN(num) || num <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    setUpdatingExpense(true);
    try {
      const res = await fetch(`/api/expenses/${editTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          category: editCategory,
          amount: num,
          date: editDate,
          notes: editNotes.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to update expense");
        return;
      }
      toast.success("Expense updated successfully");
      setEditTarget(null);
      loadExpenses();
      loadProfitData();
    } catch {
      toast.error("Something went wrong while updating expense");
    } finally {
      setUpdatingExpense(false);
    }
  }

  // Handle Confirm Delete Expense
  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${deleteTarget._id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to delete expense");
        return;
      }
      toast.success("Expense deleted successfully");
      if (viewExpense?._id === deleteTarget._id) setViewExpense(null);
      setDeleteTarget(null);
      loadExpenses();
      loadProfitData();
    } catch {
      toast.error("Failed to delete expense");
    } finally {
      setDeleting(false);
    }
  }

  const bestSelling = profitData?.bestSelling?.products || [];
  const totalSoldUnits = profitData?.bestSelling?.totalSold || 0;
  const expenseCategories = profitData?.expenses?.categories || [];
  const totalExpensesAmount = profitData?.expenses?.total || 0;
  const timeline = profitData?.timeline || [];

  return (
    <div className="flex flex-col gap-5">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Profit & Expenses
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
          Monitor your paid order revenue, operational expenses, net profit, and product performance.
        </p>
      </div>

      {/* Row 1: Best Selling Products (Donut) & Expenses (Pie) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 items-stretch">
        {/* Card 1: Best Selling Products */}
        <Card className="p-5 flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">
              Best Selling Products
            </h2>
            <TimeframeDropdown
              value={bestSellingTimeframe}
              startDate={bestSellingCustomStart}
              endDate={bestSellingCustomEnd}
              onChange={(v, customRange) => {
                setBestSellingTimeframe(v);
                if (customRange) {
                  setBestSellingCustomStart(customRange.startDate);
                  setBestSellingCustomEnd(customRange.endDate);
                }
              }}
            />
          </div>

          <div className="flex-1 my-4 flex flex-col sm:flex-row items-center justify-between gap-6 min-w-0">
            {/* Donut Chart with center label */}
            <div
              className="relative flex h-[180px] w-[180px] min-h-[180px] min-w-[180px] items-center justify-center shrink-0"
              onMouseEnter={() => setBestSellingHovered(true)}
              onMouseLeave={() => setBestSellingHovered(false)}
            >
              {/* Center text in donut hole (placed before chart with z-0, hidden on hover) */}
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-150 z-0",
                  bestSellingHovered ? "opacity-0" : "opacity-100"
                )}
              >
                <span className="text-2xl font-extrabold text-slate-900 leading-tight">
                  {totalSoldUnits}
                </span>
                <span className="text-xs font-medium text-slate-400">Sold</span>
              </div>

              <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                <PieChart>
                  <Tooltip
                    content={<BestSellingTooltip />}
                    wrapperStyle={{ zIndex: 50 }}
                  />
                  <Pie
                    data={
                      bestSelling.length > 0
                        ? bestSelling
                        : [{ name: "No Sales", unitsSold: 1, color: "#f1f5f9" }]
                    }
                    dataKey="unitsSold"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={84}
                    paddingAngle={bestSelling.length > 0 ? 3 : 0}
                    stroke="transparent"
                  >
                    {(bestSelling.length > 0
                      ? bestSelling
                      : [{ color: "#e2e8f0" }]
                    ).map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Right Legend with percentage */}
            <div className="flex-1 w-full min-w-0 space-y-2.5">
              {bestSelling.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                  <p className="text-xs">No product sales in this period</p>
                </div>
              ) : (
                bestSelling.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-2.5 text-xs font-medium min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="h-2.5 w-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-700 truncate block font-medium" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-right">
                      <span className="text-slate-400 font-normal whitespace-nowrap text-[11px] sm:text-xs">{item.percentage}%</span>
                      <span className="text-slate-800 font-semibold whitespace-nowrap text-[11px] sm:text-xs">
                        {item.unitsSold} {item.unitsSold === 1 ? "unit" : "units"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom Total Summary */}
          <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
            <span className="text-slate-400">Total Units Sold •</span>
            <span className="text-sm font-bold text-slate-900">
              {totalSoldUnits} {totalSoldUnits === 1 ? "Unit" : "Units"}
            </span>
          </div>
        </Card>

        {/* Card 2: Expenses (Pie) */}
        <Card className="p-5 flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">Expenses</h2>
            <TimeframeDropdown
              value={expensesTimeframe}
              startDate={expensesCustomStart}
              endDate={expensesCustomEnd}
              onChange={(v, customRange) => {
                setExpensesTimeframe(v);
                if (customRange) {
                  setExpensesCustomStart(customRange.startDate);
                  setExpensesCustomEnd(customRange.endDate);
                }
              }}
            />
          </div>

          <div className="flex-1 my-4 flex flex-col sm:flex-row items-center justify-between gap-6 min-w-0">
            {/* Pie Chart */}
            <div className="relative flex h-[190px] w-[190px] min-h-[190px] min-w-[190px] items-center justify-center shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={<ExpenseCategoryTooltip />}
                    wrapperStyle={{ zIndex: 50 }}
                  />
                  <Pie
                    data={
                      expenseCategories.length > 0
                        ? expenseCategories
                        : [{ category: "No Expenses", amount: 1, color: "#f1f5f9" }]
                    }
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {(expenseCategories.length > 0
                      ? expenseCategories
                      : [{ color: "#e2e8f0" }]
                    ).map((entry, idx) => (
                      <Cell key={`exp-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Right Legend with percentage and amount */}
            <div className="flex-1 w-full min-w-0 space-y-2.5">
              {expenseCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                  <p className="text-xs">No expenses in this period</p>
                </div>
              ) : (
                expenseCategories.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between gap-2.5 text-xs font-medium min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-700 truncate block font-medium" title={item.category}>
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 text-right">
                      <span className="text-slate-400 font-normal whitespace-nowrap text-[11px] sm:text-xs">{item.percentage}%</span>
                      <span className="text-slate-800 font-semibold whitespace-nowrap text-[11px] sm:text-xs">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom Total Summary */}
          <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
            <span className="text-slate-400">Total Expenses •</span>
            <span className="text-sm font-bold text-slate-900">
              {formatCurrency(totalExpensesAmount)}
            </span>
          </div>
        </Card>
      </div>

      {/* Row 2: Revenue Generated (Dual Line / Area Chart) */}
      <Card className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">
              Revenue Generated
            </h2>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-[#093b84]" />
                Revenue
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                Expenses
              </span>
            </div>
          </div>
          <TimeframeDropdown
            value={revenueTimeframe}
            startDate={revenueCustomStart}
            endDate={revenueCustomEnd}
            onChange={(v, customRange) => {
              setRevenueTimeframe(v);
              if (customRange) {
                setRevenueCustomStart(customRange.startDate);
                setRevenueCustomEnd(customRange.endDate);
              }
            }}
          />
        </div>

        {/* Chart Container */}
        <div className="mt-4 h-[260px] w-full">
          {profitLoading ? (
            <div className="flex h-full items-center justify-center">
              <LoadingState label="Loading chart..." />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#093b84" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#093b84" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(val) => `LKR ${Number(val).toLocaleString()}`}
                  width={75}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#093b84"
                  strokeWidth={2.5}
                  fill="url(#revGradient)"
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#ffffff", stroke: "#ef4444", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: "#ef4444" }}
                  name="Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Row 3: Expenses Table */}
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Expenses</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Detailed log of recent operating and business expenses
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <CategoryFilterDropdown
              value={expenseCategoryFilter}
              onChange={(cat) => {
                setExpenseCategoryFilter(cat);
                setExpensePage(1);
              }}
            />
            {expenseCategoryFilter !== "all" && (
              <button
                type="button"
                onClick={() => {
                  setExpenseCategoryFilter("all");
                  setExpensePage(1);
                }}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition shadow-xs"
                title="Reset category filter"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
                <span>Reset</span>
              </button>
            )}
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
          </div>
        </div>

        {/* Expenses List */}
        <div className="mt-2 overflow-x-auto">
          {expensesLoading ? (
            <div className="py-12">
              <LoadingState label="Loading expenses..." />
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              {expenseCategoryFilter !== "all" ? (
                <div>
                  <p>
                    No expenses found in category &quot;
                    <span className="font-semibold text-slate-700">{expenseCategoryFilter}</span>
                    &quot;.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setExpenseCategoryFilter("all");
                      setExpensePage(1);
                    }}
                    className="mt-2 text-xs font-medium text-brand hover:underline cursor-pointer"
                  >
                    Clear category filter
                  </button>
                </div>
              ) : (
                <>No expenses recorded yet. Click &quot;+ Add Expense&quot; to log your first expense.</>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                  <th className="py-3 px-3">Title / Expense</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => {
                  const style =
                    CATEGORY_STYLE_MAP[exp.category] || CATEGORY_STYLE_MAP["Other"];
                  return (
                    <tr
                      key={exp._id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      {/* Title / Expense */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                              style.bg
                            )}
                          >
                            <span className={cn("h-2.5 w-2.5 rounded-full", style.dot)} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">
                              {exp.title}
                            </p>
                            <p className="text-xs text-slate-400 leading-tight mt-0.5">
                              {exp.description || "Operational cost"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category Pill */}
                      <td className="py-3.5 px-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                            style.bg,
                            style.text,
                            style.border
                          )}
                        >
                          {exp.category}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(exp.amount)}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(exp.date)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewExpense(exp)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand cursor-pointer transition"
                            title="View expense details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(exp)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand cursor-pointer transition"
                            title="Edit expense"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(exp)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer transition"
                            title="Delete expense"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {expenseMeta.total > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {(expensePage - 1) * expenseMeta.limit + 1}-
                {Math.min(expensePage * expenseMeta.limit, expenseMeta.total)}
              </span>{" "}
              of <span className="font-semibold text-slate-700">{expenseMeta.total}</span>{" "}
              expenses
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setExpensePage((p) => Math.max(1, p - 1))}
                disabled={expensePage <= 1}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
              >
                &lt; Prev
              </button>

              {Array.from({ length: expenseMeta.totalPages }, (_, i) => i + 1).map((num) => {
                const isActive = num === expensePage;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setExpensePage(num)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition cursor-pointer",
                      isActive
                        ? "bg-brand text-white font-semibold shadow-xs"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {num}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  setExpensePage((p) => Math.min(expenseMeta.totalPages, p + 1))
                }
                disabled={expensePage >= expenseMeta.totalPages}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
              >
                Next &gt;
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Expense Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Expense"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-expense-form"
              loading={submittingExpense}
            >
              Save Expense
            </Button>
          </>
        }
      >
        <form id="add-expense-form" onSubmit={handleCreateExpense} className="space-y-4">
          <Input
            label="Title / Expense"
            placeholder="e.g. Staff Salaries & Payroll"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />

          <Input
            label="Subtitle / Description"
            placeholder="e.g. Monthly Disbursement, Consumables Supply"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />

          <Select
            label="Category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <Input
            label="Amount (LKR)"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="e.g. 6000"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            required
          />

          <Input
            label="Date"
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Additional expense details..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </form>
      </Modal>

      {/* View Expense Detail Modal */}
      <Modal
        open={!!viewExpense}
        onClose={() => setViewExpense(null)}
        title="Expense Details"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                const target = viewExpense;
                setViewExpense(null);
                setDeleteTarget(target);
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const target = viewExpense;
                  if (!target) return;
                  setViewExpense(null);
                  openEditModal(target);
                }}
              >
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button variant="secondary" onClick={() => setViewExpense(null)}>
                Close
              </Button>
            </div>
          </div>
        }
      >
        {viewExpense && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {viewExpense.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {viewExpense.description || "Operational expense"}
                </p>
              </div>
              <span className="text-lg font-extrabold text-slate-900">
                {formatCurrency(viewExpense.amount)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 p-2.5">
                <span className="text-slate-400 block mb-0.5">Category</span>
                <span className="font-semibold text-slate-800">
                  {viewExpense.category}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5">
                <span className="text-slate-400 block mb-0.5">Date Incurred</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(viewExpense.date)}
                </span>
              </div>
            </div>

            {viewExpense.notes && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs">
                <span className="text-slate-400 block mb-1 font-medium">Notes</span>
                <p className="text-slate-700 whitespace-pre-wrap">{viewExpense.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Expense Modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Expense"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-expense-form"
              loading={updatingExpense}
            >
              Update Expense
            </Button>
          </>
        }
      >
        <form id="edit-expense-form" onSubmit={handleUpdateExpense} className="space-y-4">
          <Input
            label="Title / Expense"
            placeholder="e.g. Staff Salaries & Payroll"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />

          <Input
            label="Subtitle / Description"
            placeholder="e.g. Monthly Disbursement, Consumables Supply"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />

          <Select
            label="Category"
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <Input
            label="Amount (LKR)"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="e.g. 6000"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            required
          />

          <Input
            label="Date"
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Additional expense details..."
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </form>
      </Modal>

      {/* Warning Confirmation Dialog Box for Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
