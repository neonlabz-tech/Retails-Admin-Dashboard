"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from "lucide-react";
import { Button, Input, LoadingState } from "@/components/ui/primitives";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-3">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Missing Reset Token</h2>
        <p className="mt-1 text-sm text-slate-500">
          This password reset link is invalid or has expired. Please request a new link from your profile or login page.
        </p>
        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition"
          >
            <span>Back to Sign In</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Password Reset Complete!</h2>
        <p className="mt-1 text-sm text-slate-500">
          Your admin password has been successfully updated. You can now use your new password to sign in.
        </p>
        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to reset password. Please try again.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200/80 px-3.5 py-2.5 text-xs sm:text-sm text-rose-600">
          {error}
        </div>
      )}

      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-slate-400" />
        <Input
          label="New Password"
          type={showPassword ? "text" : "password"}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="pl-9 pr-9"
          placeholder="At least 6 characters"
          hint="Minimum 6 characters"
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-slate-400" />
        <Input
          label="Confirm New Password"
          type={showPassword ? "text" : "password"}
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="pl-9 pr-9"
          placeholder="Repeat new password"
        />
      </div>

      <Button type="submit" loading={loading} className="mt-2 w-full" size="lg">
        Reset Password
      </Button>

      <div className="text-center pt-2">
        <Link href="/login" className="text-xs font-medium text-slate-500 hover:text-brand transition">
          Back to Sign In
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-200 border border-slate-100">
            <Image
              src="/images/logo.png"
              alt="RKF Logo"
              width={64}
              height={64}
              priority
              className="h-full w-full object-contain scale-125"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Set New Password</h1>
            <p className="text-sm text-slate-500">Create a secure new password for your admin account</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <Suspense fallback={<LoadingState label="Loading..." />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
