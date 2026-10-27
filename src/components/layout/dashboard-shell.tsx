"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function DashboardShell({
  admin,
  children,
}: {
  admin: { name: string; email: string; role: string; avatar?: string } | null;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-subtle">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col lg:pl-[264px]">
        <Header onMenuClick={() => setSidebarOpen(true)} admin={admin} />
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-4 lg:px-8 lg:py-4">{children}</main>
      </div>
    </div>
  );
}
