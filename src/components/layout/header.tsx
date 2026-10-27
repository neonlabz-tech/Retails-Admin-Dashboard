"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Bell, LogOut, UserCircle, Settings, ChevronRight, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuClick: () => void;
  admin: { name: string; email: string; role: string } | null;
}

const LABELS: Record<string, string> = {
  dashboard: "Overview",
  products: "Products",
  categories: "Categories",
  orders: "Orders",
  stock: "Stock & Inventory",
  customers: "Customers",
  payments: "Payments",
  notifications: "Notifications",
  settings: "Settings",
  profile: "Admin Profile",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = (pathname || "").split("/").filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-sm text-slate-500">
      <Link href="/dashboard" className="hover:text-slate-700">
        Home
      </Link>
      {segments.map((seg, idx) => {
        const href = "/" + segments.slice(0, idx + 1).join("/");
        const label = LABELS[seg] || seg;
        const isLast = idx === segments.length - 1;
        return (
          <span key={href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            {isLast ? (
              <span className="font-medium text-slate-700">{label}</span>
            ) : (
              <Link href={href} className="hover:text-slate-700 capitalize">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function Header({ onMenuClick, admin }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const latestNotifIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
<<<<<<< Updated upstream
    async function loadUnread() {
      try {
        const res = await fetch("/api/notifications?unreadOnly=true&limit=1");
        const json = await res.json();
        if (active && json.success) setUnread(json.data.meta.total);
=======
    let lastFetched = 0;

    async function loadUnread(isPeriodic = false) {
      try {
        const res = await fetch("/api/notifications?unreadOnly=true&limit=1");
        const json = await res.json();
        if (active && json.success) {
          const nextCount = json.data.unreadCount ?? json.data.meta?.total ?? 0;
          const latestNotif = json.data.notifications?.[0];

          if (
            isPeriodic &&
            latestNotif &&
            latestNotifIdRef.current &&
            latestNotif._id !== latestNotifIdRef.current
          ) {
            // New notification arrived in background (e.g. customer placed an order)
            toast.info(`🔔 ${latestNotif.title}: ${latestNotif.message}`);
            window.dispatchEvent(new Event("notifications-updated"));
          }

          if (latestNotif) {
            latestNotifIdRef.current = latestNotif._id;
          }

          setUnread(nextCount);
          lastFetched = Date.now();
        }
>>>>>>> Stashed changes
      } catch {
        /* ignore */
      }
    }
    loadUnread();
<<<<<<< Updated upstream
    const interval = setInterval(loadUnread, 20000);
    return () => {
      active = false;
      clearInterval(interval);
=======

    // Check for incoming notifications every 15 seconds
    const interval = setInterval(() => {
      loadUnread(true);
    }, 15000);

    const onNotificationsUpdated = () => loadUnread(false);
    const onFocus = () => {
      // Refresh on tab focus if at least 15 seconds have passed
      if (Date.now() - lastFetched > 15000) {
        loadUnread(false);
      }
    };

    window.addEventListener("notifications-updated", onNotificationsUpdated);
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("notifications-updated", onNotificationsUpdated);
      window.removeEventListener("focus", onFocus);
>>>>>>> Stashed changes
    };
  }, [toast]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out successfully");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200/70 bg-brand-subtle/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-lg p-2 text-slate-500 hover:bg-slate-200/60 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <Link href="/dashboard/notifications" className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-200/50 hover:text-slate-800 transition-colors">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute 1 top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-brand ring-2 ring-brand-subtle" />
          )}
        </Link>
        <div className="h-6 w-px bg-slate-200" />
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2.5 rounded-xl p-1 hover:bg-slate-200/50 transition-colors cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-hover text-sm font-bold text-white shadow-sm">
              {admin?.name?.charAt(0)?.toUpperCase() || "S"}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-slate-900 leading-tight">{admin?.name || "Super Admin"}</p>
              <p className="text-xs text-slate-400 leading-tight capitalize">{admin?.role ? admin.role.replace("_", " ") : "Super Admin"}</p>
            </div>
            <ChevronDown className={cn("hidden sm:block h-3.5 w-3.5 text-slate-400 transition-transform duration-200", menuOpen && "rotate-180")} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200/80 bg-white py-1.5 shadow-xl shadow-slate-900/5">
              <Link
                href="/dashboard/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 font-medium"
              >
                <UserCircle className="h-4 w-4" /> Profile
              </Link>
              {/* <Link
                href="/dashboard/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 font-medium"
              >
                <Settings className="h-4 w-4" /> Settings
              </Link> */}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 font-medium"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
