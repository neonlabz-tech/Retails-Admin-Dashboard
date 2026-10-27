"use client";

import { type ReactNode, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "./primitives";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  hideHeader = false,
  className,
  bodyClassName,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  hideHeader?: boolean;
  className?: string;
  bodyClassName?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const sizes: Record<string, string> = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    "2xl": "max-w-5xl",
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className={cn("animate-modal-in w-full rounded-2xl bg-white shadow-xl", sizes[size], className)}>
        {!hideHeader && (
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="text-base font-semibold text-slate-900 flex-1 min-w-0 pr-3">{title}</div>
            <button onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className={cn("max-h-[75vh] overflow-y-auto px-5 py-4", bodyClassName)}>{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({
  open,
  title = "Are you sure?",
  description,
  confirmLabel = "Delete",
  variant = "danger",
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="animate-modal-in w-full max-w-[360px] rounded-3xl bg-white p-7 text-center shadow-2xl">
        {/* Centered Glowing Red Circle Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500 ring-8 ring-rose-50/60">
          <AlertCircle className="h-7 w-7" strokeWidth={2.2} />
        </div>

        {/* Title */}
        <h3 className="mt-5 text-lg font-bold text-slate-900 leading-snug">{title}</h3>

        {/* Description */}
        {description && (
          <p className="mt-2 text-xs text-slate-500 leading-relaxed px-1">
            {description}
          </p>
        )}

        {/* Buttons (Side by Side) */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full rounded-xl bg-slate-100 py-2.5 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "w-full rounded-xl py-2.5 px-4 text-sm font-semibold text-white shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2",
              variant === "danger"
                ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800"
                : "bg-brand hover:bg-brand-hover active:bg-brand-active"
            )}
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : null}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
