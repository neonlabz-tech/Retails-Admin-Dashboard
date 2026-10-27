"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------------- Button --------------------------------- */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const variants: Record<string, string> = {
      primary: "bg-brand text-white hover:bg-brand-hover focus-visible:outline-brand shadow-sm",
      secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:outline-slate-400",
      danger: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600 shadow-sm",
      ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
      outline: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    };
    const sizes: Record<string, string> = {
      sm: "px-2.5 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-5 py-2.5 text-base",
    };
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

/* ----------------------------------- Input ---------------------------------- */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, hint, id, ...props }, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className={cn("text-sm font-medium", error ? "text-rose-600 font-semibold" : "text-slate-700")}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20",
          error && "border-rose-400 focus:border-rose-500 focus:ring-rose-100",
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
});
Input.displayName = "Input";

/* --------------------------------- Textarea --------------------------------- */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, label, error, id, ...props }, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20",
          error && "border-rose-400",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
});
Textarea.displayName = "Textarea";

/* ---------------------------------- Select ---------------------------------- */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, label, error, id, children, ...props }, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          className={cn(
            "peer w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 cursor-pointer",
            error && "border-rose-400",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 peer-focus:rotate-180 transition-transform duration-200" />
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
});
Select.displayName = "Select";

/* ----------------------------------- Badge ---------------------------------- */
export function Badge({ children, color = "slate" }: { children: ReactNode; color?: "slate" | "green" | "red" | "yellow" | "blue" | "purple" | "orange" }) {
  const colors: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-rose-100 text-rose-700",
    yellow: "bg-amber-100 text-amber-700",
    blue: "bg-sky-100 text-sky-700",
    purple: "bg-violet-100 text-violet-700",
    orange: "bg-orange-100 text-orange-700",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize", colors[color])}>
      {children}
    </span>
  );
}

/* ----------------------------------- Card ----------------------------------- */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-300 bg-white shadow-sm transition-shadow duration-200",
        className
      )}
    >
      {children}
    </div>
  );
}

/* --------------------------------- StatCard --------------------------------- */
export function StatCard({
  label,
  value,
  icon,
  color = "indigo",
  trend,
  className,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: "indigo" | "emerald" | "rose" | "amber" | "sky" | "violet" | "purple" | "cyan";
  trend?: string;
  className?: string;
}) {
  const colors: Record<string, string> = {
    indigo: "bg-blue-50 text-brand border border-brand/20",
    emerald: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    rose: "bg-rose-50 text-rose-600 border border-rose-200",
    amber: "bg-amber-50 text-amber-600 border border-amber-200",
    sky: "bg-sky-50 text-sky-600 border border-sky-200",
    violet: "bg-violet-50 text-violet-600 border border-violet-200",
    purple: "bg-purple-50 text-purple-600 border border-purple-200",
    cyan: "bg-cyan-50 text-cyan-600 border border-cyan-200",
  };

  const renderValue = () => {
    if (typeof value === "string") {
      const match = value.match(/^([+-]?LKR)\s+(.+)$/i);
      if (match) {
        return (
          <span className="inline-flex items-baseline gap-1.5">
            <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-800">
              {match[1]}
            </span>
            <span>{match[2]}</span>
          </span>
        );
      }
    }
    return value;
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #e1ecfa 0%, #d4e4f7 100%)",
        borderColor: "rgba(15, 30, 65, 0.35)",
      }}
      className={cn(
        "rounded-2xl border border-[#0f1e41]/35 bg-gradient-to-br from-[#e1ecfa] to-[#d4e4f7] metric-card-gradient p-6 shadow-[0_10px_25px_-4px_rgba(15,23,42,0.12),0_4px_10px_-2px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-4px_rgba(15,23,42,0.16)]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl shadow-xs", colors[color])}>{icon}</div>
      </div>
      <p className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{renderValue()}</p>
      {trend && <p className="mt-1.5 text-xs font-medium text-slate-500">{trend}</p>}
    </div>
  );
}

/* --------------------------------- Spinner ---------------------------------- */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-brand", className)} />;
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <Spinner className="h-7 w-7" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/* -------------------------------- EmptyState -------------------------------- */
export function EmptyState({
  title = "No data found",
  description,
  icon,
  action,
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      {icon && <div className="mb-2 text-slate-300">{icon}</div>}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ----------------------------------- Tabs ------------------------------------ */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition cursor-pointer",
            active === tab.key ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn("inline-flex shrink-0 items-center gap-3 select-none", disabled && "opacity-50")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:cursor-not-allowed",
          checked ? "bg-brand" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
      {label && (
        <span
          onClick={() => !disabled && onChange(!checked)}
          className={cn("text-sm font-medium text-slate-700", !disabled && "cursor-pointer hover:text-slate-900")}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/* -------------------------------- PageHeader -------------------------------- */
export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-0.5 text-xs sm:text-sm text-slate-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export { Tooltip } from "./tooltip";
export type { TooltipProps } from "./tooltip";
