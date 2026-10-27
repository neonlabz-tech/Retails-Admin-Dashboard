import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Admin } from "@/models/Admin";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  let avatar: string | undefined;
  let name = session.name;
  let email = session.email;
  let role = session.role;

  try {
    await connectDB();
    const dbAdmin = await Admin.findById(session.adminId).select("name email role avatar").lean();
    if (dbAdmin) {
      name = dbAdmin.name || name;
      email = dbAdmin.email || email;
      role = dbAdmin.role || role;
      avatar = dbAdmin.avatar || undefined;
    }
  } catch {
    /* fallback to session */
  }

  return (
    <DashboardShell admin={{ name, email, role, avatar }}>
      {children}
    </DashboardShell>
  );
}
