"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  Heart,
  LayoutDashboard,
  Users,
  FileText,
  Activity,
  Calendar,
  Pill,
  Bell,
  Settings,
  Menu,
  X,
  ChevronLeft,
  CreditCard,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/analytics", label: "Analytics", icon: Activity },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/visits", label: "Visits", icon: Calendar },
  { href: "/dashboard/medications", label: "Medications", icon: Pill },
  { href: "/dashboard/family", label: "Family", icon: Users },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-white/70 backdrop-blur-xl backdrop-saturate-150 border-r border-white/40 transition-all duration-300 flex flex-col shadow-lg shadow-slate-100/30
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${sidebarCollapsed ? "w-[72px]" : "w-64"}
        `}
      >
        {/* Logo */}
        <div className="h-16 lg:h-20 flex items-center justify-between px-4 border-b border-white/40">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-navy rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-navy/20">
              <Heart className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-lg font-bold text-navy">
                care<span className="text-blue">desk</span>
              </span>
            )}
          </Link>
          <button
            className="lg:hidden p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
          <button
            className="hidden lg:flex p-1 rounded-lg hover:bg-slate-100"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft className={`w-4 h-4 text-slate-400 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? "bg-blue-pale text-blue"
                    : "text-slate-500 hover:bg-slate-50 hover:text-navy"
                  }
                  ${sidebarCollapsed ? "justify-center" : ""}
                `}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade Card */}
        {!sidebarCollapsed && (
          <div className="p-3 mx-3 mb-4 bg-gradient-to-br from-navy to-blue rounded-xl shadow-xl shadow-navy/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-sm pointer-events-none" />
            <div className="relative z-10">
              <CreditCard className="w-5 h-5 text-white/80 mb-2" />
              <p className="text-xs font-semibold text-white mb-1">Upgrade to Premium</p>
              <p className="text-[11px] text-white/70 mb-3">Get unlimited reports and family members</p>
              <Link
                href="/dashboard/settings"
                className="block text-center text-xs font-semibold bg-white/90 backdrop-blur-sm text-navy rounded-lg py-1.5 hover:bg-white transition-colors shadow-lg"
              >
                Upgrade Now
              </Link>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar — Glass */}
        <header className="h-16 lg:h-20 bg-white/60 backdrop-blur-xl backdrop-saturate-150 border-b border-white/40 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <button
            className="lg:hidden p-2 -ml-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>

          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold text-navy capitalize">
              {pathname?.split("/").pop()?.replace(/-/g, " ") || "Dashboard"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/dashboard/alerts" className="relative p-2 rounded-lg hover:bg-slate-50">
              <Bell className="w-5 h-5 text-slate-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9",
                },
              }}
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8"><ErrorBoundary>{children}</ErrorBoundary></main>
      </div>
    </div>
  );
}
