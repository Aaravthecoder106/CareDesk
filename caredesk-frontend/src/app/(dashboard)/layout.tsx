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
  Folder,
  MessageSquare,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/analytics", label: "Analytics", icon: Activity },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/medical-journey", label: "Medical Journey", icon: Folder },
  { href: "/dashboard/chat", label: "AI Chat", icon: MessageSquare },
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
    <div className="min-h-screen bg-[#FAFBFC] flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-white border-r border-slate-200 transition-all duration-300 flex flex-col
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${sidebarCollapsed ? "w-[72px]" : "w-60"}
        `}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-navy rounded-xl flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-lg font-bold text-slate-900 leading-none">
                care<span className="text-blue">desk</span>
              </span>
            )}
          </Link>
          <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4 text-slate-400" />
          </button>
          <button
            className="hidden lg:flex p-1.5 rounded-md hover:bg-slate-100"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft className={`w-3.5 h-3.5 text-slate-400 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all
                  ${isActive
                    ? "bg-blue-pale text-blue"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }
                  ${sidebarCollapsed ? "justify-center" : ""}
                `}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="w-4.5 h-4.5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!sidebarCollapsed && (
          <div className="p-2.5 mx-2.5 mb-3 bg-gradient-to-br from-navy to-blue rounded-xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-xs font-semibold text-white mb-0.5">Upgrade to Premium</p>
              <p className="text-[11px] text-white/60 mb-2.5">Unlimited reports & family</p>
              <Link
                href="/dashboard/settings"
                className="block text-center text-[11px] font-semibold bg-white text-navy rounded-lg py-1.5 hover:bg-white/90 transition-colors"
              >
                Upgrade
              </Link>
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <button className="lg:hidden p-2 -ml-2" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-slate-600" />
          </button>

          <div className="hidden lg:block">
            <h1 className="text-base font-semibold text-slate-900 capitalize">
              {pathname?.split("/").pop()?.replace(/-/g, " ") || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/alerts" className="relative p-2 rounded-lg hover:bg-slate-50 text-slate-500">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6"><ErrorBoundary>{children}</ErrorBoundary></main>
      </div>
    </div>
  );
}
