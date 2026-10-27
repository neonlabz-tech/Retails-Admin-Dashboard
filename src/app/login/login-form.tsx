"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [view, setView] = useState<"login" | "forgot">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Invalid email or password");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError("");
    try {
      const targetEmail = forgotEmail.trim() || email.trim() || "info@rkfdistributors.lk";
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setForgotError(json.message || "Failed to send reset link");
        return;
      }
      setForgotSuccess(true);
    } catch {
      setForgotError("Failed to send reset email. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-7 sm:p-9 shadow-xl shadow-slate-300/40">
      {/* Top Logo */}
      <div className="flex justify-center mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/80 bg-white shadow-2xs p-2">
          <Image
            src="/images/logo.png"
            alt="RKF Logo"
            width={48}
            height={48}
            priority
            className="h-full w-full object-contain"
          />
        </div>
      </div>

      {view === "login" ? (
        <>
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">RKF Admin</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Sign in to manage your e-commerce &amp; retail store
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200/80 px-3.5 py-2.5 text-xs sm:text-sm text-rose-600">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-slate-800 mb-1.5 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800 mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email || "info@rkfdistributors.lk");
                    setView("forgot");
                    setError("");
                  }}
                  className="text-xs font-medium text-slate-600 hover:text-brand transition cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-xs hover:bg-brand-hover active:bg-brand-active transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Sign in</span>
            </button>
          </form>
        </>
      ) : (
        <>
          {/* Forgot Password View */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Reset Password
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Enter your registered email to receive a password reset link
            </p>
          </div>

          {forgotSuccess ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-900">Reset Link Sent!</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                We&apos;ve sent a password reset link to{" "}
                <strong className="text-slate-800">{forgotEmail || "your email"}</strong>. Please check your inbox.
              </p>
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setForgotSuccess(false);
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
              {forgotError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200/80 px-3.5 py-2.5 text-xs sm:text-sm text-rose-600">
                  {forgotError}
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-slate-800 mb-1.5 block">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="info@rkfdistributors.lk"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand shadow-2xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="mt-1 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-xs hover:bg-brand-hover active:bg-brand-active transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {forgotLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Send Reset Link</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
