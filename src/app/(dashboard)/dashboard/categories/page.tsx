"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Tags, X, HelpCircle, Loader2 } from "lucide-react";
import { Button, Badge, Card, Input, Textarea, Switch } from "@/components/ui/primitives";
import { DataTable, type Column, Pagination, SearchInput } from "@/components/ui/table";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/components/ui/toast";
import { cn, formatDate } from "@/lib/utils";

interface SubcategoryItem {
  _id?: string;
  name: string;
  slug?: string;
  description?: string;
}

interface CategoryRow {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  isActive: boolean;
  subcategories?: SubcategoryItem[];
  productCount: number;
  createdAt: string;
}

const emptyForm = {
  name: "",
  description: "",
  image: "",
  isActive: true,
  subcategories: [] as SubcategoryItem[],
};

export default function CategoriesPage() {
  const toast = useToast();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 10 });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [subInput, setSubInput] = useState("");

  function clearFieldError(field: string) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", "10");
      const res = await fetch(`/api/categories?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setCategories(json.data.categories);
        setMeta(json.data.meta);
      }
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFieldErrors({});
    setSubInput("");
    setModalOpen(true);
  }

  function openEdit(category: CategoryRow) {
    setEditing(category);
    setFieldErrors({});
    setForm({
      name: category.name,
      description: category.description || "",
      image: category.image || "",
      isActive: category.isActive,
      subcategories: category.subcategories || [],
    });
    setSubInput("");
    setModalOpen(true);
  }

  function handleAddSubcategory() {
    const trimmed = subInput.trim();
    if (!trimmed) return;
    const exists = form.subcategories.some(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      toast.error("Subcategory already added");
      return;
    }
    setForm((f) => ({
      ...f,
      subcategories: [...f.subcategories, { name: trimmed }],
    }));
    setSubInput("");
  }

  function handleRemoveSubcategory(index: number) {
    setForm((f) => ({
      ...f,
      subcategories: f.subcategories.filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Category name is required";
    if (!form.image || !form.image.trim()) errs.image = "Category image is required";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/categories/${editing._id}` : "/api/categories", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (json.errors && typeof json.errors === "object") {
          const backendFieldErrors: Record<string, string> = {};
          for (const [key, val] of Object.entries(json.errors)) {
            if (Array.isArray(val) && val[0]) {
              backendFieldErrors[key] = String(val[0]);
            } else if (typeof val === "string") {
              backendFieldErrors[key] = val;
            }
          }
          if (Object.keys(backendFieldErrors).length > 0) {
            setFieldErrors(backendFieldErrors);
            return;
          }
        }
        toast.error(json.message || "Failed to save category");
        return;
      }
      toast.success(editing ? "Category updated successfully" : "Category created successfully");
      setModalOpen(false);
      setFieldErrors({});
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${deleteTarget._id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to delete category");
        return;
      }
      toast.success("Category deleted successfully");
      setDeleteTarget(null);
      load();
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<CategoryRow>[] = useMemo(
    () => [
      {
        header: "Category",
        key: "name",
        render: (c) => (
          <div className="flex items-center gap-3">
            {c.image ? (
              <Image src={c.image} alt={c.name} width={40} height={40} unoptimized className="h-10 w-10 rounded-lg border border-slate-200 object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <Tags className="h-5 w-5" />
              </div>
            )}
            <div>
              <p className="font-medium text-slate-800">{c.name}</p>
              {c.description && <p className="max-w-xs truncate text-xs text-slate-400">{c.description}</p>}
            </div>
          </div>
        ),
      },
      {
        header: "Subcategories",
        key: "subcategories",
        render: (c) => (
          <span className="text-sm text-slate-600">
            {c.subcategories && c.subcategories.length > 0
              ? c.subcategories.map((sub) => sub.name).join(", ")
              : "-"}
          </span>
        ),
      },
      { header: "Products", key: "productCount", render: (c) => <Badge color="blue">{c.productCount}</Badge> },
      { header: "Status", key: "isActive", render: (c) => <Badge color={c.isActive ? "green" : "slate"}>{c.isActive ? "Active" : "Inactive"}</Badge> },
      { header: "Created", key: "createdAt", render: (c) => formatDate(c.createdAt) },
      {
        header: "Actions",
        key: "actions",
        render: (c) => (
          <div className="flex items-center gap-1">
            <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => setDeleteTarget(c)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Categories</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">Organize your products into categories.</p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <Card className="p-4">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search categories..."
          className="w-full"
        />
      </Card>

      <Card>
        <DataTable columns={columns} data={categories} loading={loading} emptyTitle="No categories found" emptyDescription="Create your first category to organize products." />
        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setFieldErrors({}); }}
        title={editing ? "Edit Category" : "Add Category"}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl bg-slate-100 hover:bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                editing ? "Save changes" : "Create Category"
              )}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 py-1">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className={cn("text-sm font-semibold", fieldErrors.name ? "text-rose-600" : "text-slate-800")}>
                Category Name <span className="text-rose-500 font-bold">*</span>
              </label>
            </div>
            <input
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                clearFieldError("name");
              }}
              placeholder="e.g. Electronics"
              required
              className={cn(
                "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition shadow-xs",
                fieldErrors.name
                  ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20"
                  : "border-slate-200 focus:border-brand focus:ring-1 focus:ring-brand"
              )}
            />
            {fieldErrors.name && (
              <p className="mt-1.5 text-xs font-medium text-rose-500">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-800">Subcategories</label>
              <span className="text-xs text-slate-400 font-medium">Optional</span>
            </div>
            <div className="flex gap-2.5">
              <input
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubcategory();
                  }
                }}
                placeholder="Enter subcategory name..."
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={handleAddSubcategory}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition active:scale-95"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <HelpCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              Press Enter or click Add to append subcategory tags
            </p>
            {form.subcategories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.subcategories.map((sub, idx) => (
                  <span
                    key={sub._id || idx}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-600"
                  >
                    {sub.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveSubcategory(idx)}
                      className="text-indigo-400 hover:text-indigo-700 transition focus:outline-none"
                      title="Remove subcategory"
                    >
                      <X className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <ImageUpload
            label="Category Image"
            required
            value={form.image}
            error={fieldErrors.image}
            onChange={(url) => {
              setForm((f) => ({ ...f, image: url }));
              clearFieldError("image");
            }}
            folder="categories"
            targetDimensions={{ width: 750, height: 750 }}
            badge="750 × 750 px"
            hint="Auto-fitted to 750 × 750 px (1:1 Square) • Max 15MB"
          />

          <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <span className="text-sm font-semibold text-slate-800">Active status</span>
                {form.isActive && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                    Live
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Visible to customers in storefront navigation and filter lists
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2",
                form.isActive ? "bg-brand" : "bg-slate-300"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                  form.isActive ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete category?"
        description={
          deleteTarget && deleteTarget.productCount > 0
            ? `This category has ${deleteTarget.productCount} product(s) assigned and cannot be deleted until they are reassigned.`
            : `This will permanently delete "${deleteTarget?.name}".`
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
