"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  Search,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Sparkles,
  X,
  Package,
} from "lucide-react";

// MUI Components for Collapsible Table
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  IconButton,
  Rating,
  Chip,
  Box,
  Tooltip,
} from "@mui/material";

import { useToast } from "@/components/ui/toast";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

interface ProductRef {
  _id: string;
  name: string;
  sku: string;
  slug: string;
  images?: string[];
  price?: number;
}

interface ReviewItem {
  _id: string;
  orderId: string;
  orderDate?: string;
  customerName: string;
  customerEmail?: string;
  productId: ProductRef | string;
  productName?: string;
  productSlug?: string;
  rating: number;
  comment: string;
  title?: string;
  status: "approved" | "pending" | "rejected";
  helpfulCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface OrderReviewGroup {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail?: string;
  orderDate: string;
  reviewCount: number;
  reviews: ReviewItem[];
}

interface ReviewStats {
  totalReviews: number;
  avgRating: number;
  approvedCount: number;
  pendingCount: number;
  fiveStars: number;
}

// Collapsible Row Component for Order Review Group
function CollapsibleOrderRow({
  group,
  isOpen,
  onToggle,
  onStatusChange,
  onDelete,
}: {
  group: OrderReviewGroup;
  isOpen: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: "approved" | "rejected") => void;
  onDelete: (id: string) => void;
}) {
  const pendingCountInGroup = group.reviews.filter((r) => r.status === "pending").length;

  return (
    <>
      {/* Main Table Row: Order ID, Customer name, Number of reviews, Order date */}
      <TableRow
        hover
        onClick={onToggle}
        sx={{
          cursor: "pointer",
          "& > *": { borderBottom: "unset" },
          bgcolor: isOpen ? "#f8fafc" : "inherit",
          transition: "background-color 0.15s ease",
        }}
      >
        {/* Expand toggle */}
        <TableCell sx={{ width: 48, py: 2, pl: 2, pr: 0 }}>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            sx={{
              color: isOpen ? "#093b84" : "#64748b",
              bgcolor: isOpen ? "#e0f2fe" : "transparent",
              transition: "all 0.15s",
            }}
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </IconButton>
        </TableCell>

        {/* 1. Order ID */}
        <TableCell sx={{ py: 2 }}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-brand bg-brand/5 border border-brand/20 rounded-lg px-2.5 py-1">
              {group.orderId}
            </span>
          </div>
        </TableCell>

        {/* 2. Customer Name */}
        <TableCell sx={{ py: 2 }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
              {(group.customerName || "Customer")
                .split(" ")
                .filter(Boolean)
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "C"}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 text-sm leading-tight truncate">
                {group.customerName || "Customer"}
              </p>
              {group.customerEmail && (
                <p className="text-xs text-slate-400 truncate leading-tight mt-0.5">
                  {group.customerEmail}
                </p>
              )}
            </div>
          </div>
        </TableCell>

        {/* 3. Number of reviews */}
        <TableCell sx={{ py: 2 }}>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/80 px-2.5 py-1 text-xs font-bold text-blue-700">
              <MessageSquare className="h-3 w-3 text-blue-600" />
              {group.reviewCount} {group.reviewCount === 1 ? "review" : "reviews"}
            </span>
            {pendingCountInGroup > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                <Clock className="h-3 w-3 text-amber-500" />
                {pendingCountInGroup} pending
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle className="h-3 w-3 text-emerald-500" />
                approved
              </span>
            )}
          </div>
        </TableCell>

        {/* 4. Order Date */}
        <TableCell sx={{ py: 2, fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap" }}>
          {formatDate(group.orderDate)}
        </TableCell>
      </TableRow>

      {/* Expanded Content: Product name and image, Star rating, Review comment, Review status, Action */}
      <TableRow sx={{ bgcolor: "#f8fafc" }}>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2.5, px: 2 }}>
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {group.orderId ? `Reviews for ${group.orderId}` : `Direct Storefront Reviews`}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      • {group.orderId ? "Ordered on " : "Submitted on "}{formatDateTime(group.orderDate)}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    Customer: <strong className="text-slate-800">{group.customerName}</strong>
                  </span>
                </div>

                <Table size="small" aria-label={`reviews under ${group.orderId}`}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#fcfdfe" }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", color: "#64748b", py: 1.5 }}>
                        Product Name & Image
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", color: "#64748b", py: 1.5, minWidth: 140 }}>
                        Star Rating
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", color: "#64748b", py: 1.5 }}>
                        Review Comment
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", color: "#64748b", py: 1.5, minWidth: 110 }}>
                        Review Status
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", color: "#64748b", py: 1.5, textAlign: "right", pr: 2 }}>
                        Action
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.reviews.map((rev) => {
                      const productObj: ProductRef | null =
                        typeof rev.productId === "object" && rev.productId !== null
                          ? rev.productId
                          : null;
                      const productName = productObj?.name || rev.productName || "Product";
                      const productSku = productObj?.sku || "";
                      const productImage = productObj?.images?.[0] || null;

                      return (
                        <TableRow
                          key={rev._id}
                          sx={{
                            "&:last-child td, &:last-child th": { border: 0 },
                            transition: "background-color 0.15s ease",
                            "&:hover": { bgcolor: "#f8fafc" },
                          }}
                        >
                          {/* 1. Product Name and Image */}
                          <TableCell sx={{ py: 2 }}>
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 relative">
                                {productImage ? (
                                  <Image
                                    src={productImage}
                                    alt={productName}
                                    fill
                                    sizes="48px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                                    <Package className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 max-w-xs">
                                <p className="font-semibold text-slate-900 text-xs sm:text-sm line-clamp-1">
                                  {productName}
                                </p>
                                {productSku && (
                                  <span className="inline-block text-[10px] font-mono font-medium text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 mt-0.5">
                                    SKU: {productSku}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* 2. Star Rating */}
                          <TableCell sx={{ py: 2 }}>
                            <div className="flex items-center gap-1.5">
                              <Rating
                                value={rev.rating}
                                readOnly
                                precision={0.5}
                                size="small"
                                sx={{ color: "#f59e0b" }}
                              />
                              <span className="text-xs font-bold text-slate-700">
                                {rev.rating.toFixed(1)}
                              </span>
                            </div>
                          </TableCell>

                          {/* 3. Review Comment */}
                          <TableCell sx={{ py: 2, maxWidth: 320 }}>
                            <div className="rounded-lg bg-slate-50 border border-slate-200/60 p-2 text-xs">
                              {rev.title && (
                                <p className="font-bold text-slate-900 mb-0.5">
                                  {rev.title}
                                </p>
                              )}
                              <p className="text-slate-600 italic leading-relaxed">
                                &ldquo;{rev.comment}&rdquo;
                              </p>
                            </div>
                          </TableCell>

                          {/* 4. Review Status */}
                          <TableCell sx={{ py: 2 }}>
                            <Chip
                              size="small"
                              label={rev.status.toUpperCase()}
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.68rem",
                                letterSpacing: "0.03em",
                                bgcolor:
                                  rev.status === "approved"
                                    ? "#dcfce7"
                                    : rev.status === "pending"
                                    ? "#fef3c7"
                                    : "#fee2e2",
                                color:
                                  rev.status === "approved"
                                    ? "#15803d"
                                    : rev.status === "pending"
                                    ? "#b45309"
                                    : "#b91c1c",
                              }}
                            />
                          </TableCell>

                          {/* 5. Action */}
                          <TableCell sx={{ py: 2, textAlign: "right", pr: 2 }}>
                            <div className="flex items-center justify-end gap-1">
                              {rev.status !== "approved" && (
                                <Tooltip title="Approve Review" arrow>
                                  <IconButton
                                    size="small"
                                    onClick={() => onStatusChange(rev._id, "approved")}
                                    sx={{ color: "#16a34a", "&:hover": { bgcolor: "#dcfce7" } }}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {rev.status !== "rejected" && (
                                <Tooltip title="Reject Review" arrow>
                                  <IconButton
                                    size="small"
                                    onClick={() => onStatusChange(rev._id, "rejected")}
                                    sx={{ color: "#d97706", "&:hover": { bgcolor: "#fef3c7" } }}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Delete Review" arrow>
                                <IconButton
                                    size="small"
                                    onClick={() => onDelete(rev._id)}
                                    sx={{ color: "#ef4444", "&:hover": { bgcolor: "#fee2e2" } }}
                                  >
                                  <Trash2 className="h-4 w-4" />
                                </IconButton>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function ReviewsPage() {
  const toast = useToast();

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    avgRating: 0,
    approvedCount: 0,
    pendingCount: 0,
    fiveStars: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 10 });
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});



  // Fetch reviews from MongoDB via API
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (ratingFilter !== "all") params.set("rating", ratingFilter);
      params.set("page", String(page));
      params.set("limit", "15");

      const res = await fetch(`/api/reviews?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setReviews(json.data.reviews || []);
        setMeta(json.data.meta || { total: 0, totalPages: 1, limit: 15 });
        if (json.data.stats) {
          setStats(json.data.stats);
        }
      } else {
        toast.error(json.message || "Failed to load reviews");
      }
    } catch {
      toast.error("Network error while loading reviews");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, ratingFilter, page, toast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);



  // Group reviews by Order ID for the main table (only reviews with a valid orderId)
  const orderGroups: OrderReviewGroup[] = useMemo(() => {
    const map = new Map<string, OrderReviewGroup>();

    for (const r of reviews) {
      if (!r.orderId || !r.orderId.trim()) continue;
      const key = r.orderId.trim();
      const custName = r.customerName || (r as unknown as { author?: string }).author || "Customer";
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          orderId: key,
          customerName: custName,
          customerEmail: r.customerEmail || (r as unknown as { email?: string }).email || "",
          orderDate: r.orderDate || r.createdAt || new Date().toISOString(),
          reviewCount: 0,
          reviews: [],
        });
      }
      const grp = map.get(key)!;
      grp.reviews.push({
        ...r,
        customerName: custName,
        comment: r.comment || (r as unknown as { body?: string }).body || "",
      });
      grp.reviewCount = grp.reviews.length;
    }

    return Array.from(map.values());
  }, [reviews]);

  const isAllExpanded = orderGroups.length > 0 && orderGroups.every((g) => (expandedMap[g.id] ?? true));

  const toggleExpandAll = () => {
    const nextState = !isAllExpanded;
    const nextMap: Record<string, boolean> = {};
    for (const g of orderGroups) {
      nextMap[g.id] = nextState;
    }
    setExpandedMap(nextMap);
  };

  // Handle Review Status Change
  async function handleStatusChange(id: string, newStatus: "approved" | "rejected") {
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Review ${newStatus === "approved" ? "approved" : "rejected"} successfully`);
        fetchReviews();
      } else {
        toast.error(json.message || "Failed to update review status");
      }
    } catch {
      toast.error("Failed to update review");
    }
  }

  // Handle Review Delete
  async function handleDeleteReview(id: string) {
    if (!confirm("Are you sure you want to permanently delete this review?")) return;
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Review deleted successfully");
        fetchReviews();
      } else {
        toast.error(json.message || "Failed to delete review");
      }
    } catch {
      toast.error("Failed to delete review");
    }
  }



  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Customer Reviews
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
          Inspect order feedback, reviews, and ratings in the collapsible table.
        </p>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Reviews
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-brand">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalReviews}</span>
            <span className="text-xs text-slate-400">across catalog</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Average Rating
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <Star className="h-4 w-4 fill-amber-400" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.avgRating.toFixed(1)}</span>
            <span className="text-xs text-amber-600 font-medium">★ out of 5.0</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              5-Star Reviews
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.fiveStars}</span>
            <span className="text-xs text-emerald-600 font-medium">Top ratings</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Moderation
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.pendingCount}</span>
            <span className="text-xs text-amber-600 font-medium">Needs review</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Expanded Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Order ID, customer name, comment, product title or SKU..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand focus:ring-1 focus:ring-brand transition shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Status Filter Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-xs transition cursor-pointer hover:border-slate-300"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Rating Filter Dropdown */}
            <div className="relative">
              <select
                value={ratingFilter}
                onChange={(e) => {
                  setRatingFilter(e.target.value);
                  setPage(1);
                }}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-xs transition cursor-pointer hover:border-slate-300"
              >
                <option value="all">All Stars (1 - 5)</option>
                <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                <option value="3">⭐⭐⭐ 3 Stars</option>
                <option value="2">⭐⭐ 2 Stars</option>
                <option value="1">⭐ 1 Star</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Reset Filters button if any filter is active */}
            {(search || statusFilter !== "all" || ratingFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setRatingFilter("all");
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition shadow-xs cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MUI Collapsible Table: ONLY Order ID, Customer name, Number of reviews, Order date */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
          <Table aria-label="collapsible order review table" sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                <TableCell sx={{ width: 48, py: 1.5, pl: 2, pr: 0 }}>
                  <IconButton
                    size="small"
                    onClick={toggleExpandAll}
                    title={isAllExpanded ? "Collapse All" : "Expand All"}
                    sx={{ color: "#64748b" }}
                  >
                    {isAllExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </IconButton>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", py: 2 }}>
                  Order ID
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", py: 2 }}>
                  Customer Name
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", py: 2 }}>
                  Number of Reviews
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", py: 2 }}>
                  Order Date
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                      <p className="text-xs font-semibold text-slate-500">Loading reviews from MongoDB...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : orderGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <MessageSquare className="h-8 w-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">No reviews found</p>
                      <p className="text-xs text-slate-400">
                        Try adjusting your search criteria or add a customer review.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orderGroups.map((group) => (
                  <CollapsibleOrderRow
                    key={group.id}
                    group={group}
                    isOpen={expandedMap[group.id] ?? true}
                    onToggle={() =>
                      setExpandedMap((prev) => ({
                        ...prev,
                        [group.id]: !(prev[group.id] ?? true),
                      }))
                    }
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteReview}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Footer - Next and Previous Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 bg-slate-50/50">
          <p className="text-xs text-slate-500">
            Showing <strong className="font-semibold text-slate-800">{orderGroups.length === 0 ? 0 : (page - 1) * meta.limit + 1}</strong>–
            <strong className="font-semibold text-slate-800">{Math.min(page * meta.limit, meta.total)}</strong> of{" "}
            <strong className="font-semibold text-slate-800">{meta.total}</strong> reviews ({orderGroups.length} order groups)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <span className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg shadow-2xs">
              Page <strong className="font-bold text-slate-900">{page}</strong> of{" "}
              <strong className="font-bold text-slate-900">{Math.max(1, meta.totalPages || 1)}</strong>
            </span>
            <button
              type="button"
              disabled={page >= (meta.totalPages || 1) || loading}
              onClick={() => setPage((p) => Math.min(meta.totalPages || 1, p + 1))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition cursor-pointer"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
