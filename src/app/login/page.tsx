import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#ebf3fc] via-[#f1f6fc] to-[#e8f1fb] px-4 py-8">
      <div className="w-full max-w-[420px]">
        <LoginForm />
      </div>
    </div>
  );
}
