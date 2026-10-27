"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Validate token on component mount
  useEffect(() => {
    if (!token) {
      setTokenError("Missing password reset token. Please request a new link.");
      setValidatingToken(false);
      return;
    }

    async function checkToken() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token as string)}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          setTokenError(json.message || "This password reset link is invalid or has expired.");
        }
      } catch {
        setTokenError("Unable to verify reset link. Please check your connection.");
      } finally {
        setValidatingToken(false);
      }
    }

    checkToken();
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to reset password. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Loading state while checking token
  if (validatingToken) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-brand mb-3" />
        <p className="text-sm">Verifying reset link...</p>
      </div>
    );
  }

  // Token error state (invalid or expired)
  if (tokenError) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Invalid or Expired Link
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          {tokenError}
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#14235c] hover:bg-[#0f1a45] px-4 py-3 text-sm font-semibold text-white shadow-sm transition"
        >
          Request New Reset Link
        </Link>
        <div className="mt-5 text-center text-xs text-slate-500">
          <Link href="/login" className="font-bold text-[#14235c] hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Password Reset Successful!
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Your password has been updated. Redirecting you to login...
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#14235c] hover:bg-[#0f1a45] px-4 py-3 text-sm font-semibold text-white shadow-sm transition"
        >
          Go to Sign In Now
        </Link>
      </div>
    );
  }

  // Main Form (matches Image 2)
  return (
    <div className="flex flex-col">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Reset Password
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Enter your new password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-600">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-password" className="text-sm font-medium text-slate-800">
            New Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 pl-9 pr-10 text-sm text-slate-900 shadow-xs transition placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm-password" className="text-sm font-medium text-slate-800">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 pl-9 pr-10 text-sm text-slate-900 shadow-xs transition placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="Confirm new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#14235c] hover:bg-[#0f1a45] px-4 py-3 text-sm font-semibold text-white shadow-sm transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Resetting password..." : "Reset Password"}
        </button>

        <div className="mt-4 text-center text-xs text-slate-500">
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
