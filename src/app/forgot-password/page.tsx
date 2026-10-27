import { Suspense } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ForgotPasswordForm } from "./forgot-password-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Forgot Password | RKF Admin",
  description: "Reset your RKF Admin account password",
};

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#d9e6f7] via-[#ebf2fb] to-[#f4f7fb] px-4 py-12">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[450px] rounded-full bg-brand/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-16 -right-16 h-80 w-80 rounded-full bg-indigo-500/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-80 w-80 rounded-full bg-brand/15 blur-2xl" />

      <div className="relative w-full max-w-[420px]">
        {/* Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-8 sm:p-9 shadow-xl shadow-brand/5 backdrop-blur-xl">
          {/* Logo at the top of the card as shown in the screenshot */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white p-1">
              <Image
                src="/images/logo.png"
                alt="Logo"
                width={64}
                height={64}
                priority
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-slate-100" />}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
