"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail, Loader2 } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to send reset link. Please try again.");
        return;
      }

      setSentEmail(email.trim());
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // --- STATE B: SUCCESS CONFIRMATION (Image 3) ---
  if (sentEmail) {
    return (
      <div className="flex flex-col items-center text-center">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Check your email
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          We sent a password reset link to your email
        </p>

        {/* Green notification pill */}
        <div className="mt-6 w-full rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3.5 text-center text-sm font-medium text-emerald-800 shadow-xs">
          Reset instructions sent to{" "}
          <span className="font-semibold text-emerald-900 break-all">{sentEmail}</span>
        </div>

        <p className="mt-6 text-xs text-slate-500 leading-relaxed">
          Didn&apos;t receive the email? Check your spam folder or{" "}
          <button
            type="button"
            onClick={() => setSentEmail(null)}
            className="font-medium text-slate-800 hover:text-brand hover:underline cursor-pointer"
          >
            try again
          </button>
        </p>

        <div className="mt-8 pt-4 border-t border-slate-100 w-full text-center text-xs text-slate-500">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-bold text-[#14235c] hover:underline transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // --- STATE A: INPUT FORM (Image 2) ---
  return (
    <div className="flex flex-col">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Forgot your password?
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Enter your email to receive a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-600">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-slate-800">
            Email Address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 pl-9 text-sm text-slate-900 shadow-xs transition placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#14235c] hover:bg-[#0f1a45] px-4 py-3 text-sm font-semibold text-white shadow-sm transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Sending link..." : "Send Reset Link"}
        </button>

        <div className="mt-4 text-center text-xs text-slate-500">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-bold text-[#14235c] hover:underline transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}
