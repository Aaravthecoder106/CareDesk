"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Calendar,
  Pill,
  Bell,
  Users,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { DashboardSkeleton } from "@/components/Skeleton";
import type { FamilyMember, Alert, PaginatedResponse } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ reports: 0, visits: 0, medications: 0 });

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getToken();
        if (!token) return;

        const [membersRes, alertsRes, , reportsRes, visitsRes] = await Promise.all([
          api.get<{ data: FamilyMember[] }>("/family-members/", token).catch(() => ({ data: [] })),
          api.get<PaginatedResponse<Alert>>("/alerts/?page=1&limit=5", token).catch(() => ({ data: [] })),
          api.get<{ data: { unreadCount: number } }>("/alerts/unread-count", token).catch(() => ({ data: { unreadCount: 0 } })),
          api.get<{ data: { total: number } }>("/reports/?page=1&limit=1", token).catch(() => ({ data: { total: 0 } })),
          api.get<{ data: { total: number } }>("/visits/?page=1&limit=1", token).catch(() => ({ data: { total: 0 } })),
        ]);

        setFamilyMembers(membersRes.data || []);
        setAlerts(alertsRes.data || []);
        setStats({
          reports: reportsRes.data?.total || 0,
          visits: visitsRes.data?.total || 0,
          medications: 0,
        });
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const firstName = user?.firstName || "there";

  const quickActions = [
    { label: "Upload Report", href: "/dashboard/reports", icon: FileText, color: "bg-blue text-white" },
    { label: "Log Visit", href: "/dashboard/visits", icon: Calendar, color: "bg-navy text-white" },
    { label: "Add Medication", href: "/dashboard/medications", icon: Pill, color: "bg-blue text-white" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-navy">
          Good morning, {firstName}
        </h1>
        <p className="text-slate-500 mt-1">Here&apos;s your health summary</p>
      </div>

      {/* Health Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <Link href="/dashboard/reports" className="bg-white rounded-xl p-4 border border-slate-100 hover:shadow-md transition-shadow text-center">
            <p className="text-2xl font-bold text-navy">{stats.reports}</p>
            <p className="text-xs text-slate-500 mt-1">Reports</p>
          </Link>
          <Link href="/dashboard/visits" className="bg-white rounded-xl p-4 border border-slate-100 hover:shadow-md transition-shadow text-center">
            <p className="text-2xl font-bold text-navy">{stats.visits}</p>
            <p className="text-xs text-slate-500 mt-1">Visits</p>
          </Link>
          <Link href="/dashboard/medications" className="bg-white rounded-xl p-4 border border-slate-100 hover:shadow-md transition-shadow text-center">
            <p className="text-2xl font-bold text-navy">{stats.medications}</p>
            <p className="text-xs text-slate-500 mt-1">Medications</p>
          </Link>
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-semibold text-navy mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-blue-pale transition-colors group"
                >
                  <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-semibold text-navy group-hover:text-blue transition-colors">
                    {action.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                </Link>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Family Members */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-navy">Family Members</h3>
                <Link href="/dashboard/family" className="text-xs font-semibold text-blue hover:text-navy">
                  View all
                </Link>
              </div>
              {familyMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No family members yet</p>
                  <Link
                    href="/dashboard/family"
                    className="mt-3 inline-flex text-xs font-semibold text-blue hover:text-navy"
                  >
                    Add your first member
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {familyMembers.slice(0, 4).map((member) => (
                    <Link
                      key={member.id}
                      href={`/dashboard/family/${member.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-blue-pale rounded-full flex items-center justify-center text-sm font-bold text-blue">
                        {member.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-navy truncate">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.relationship}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Alerts */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-navy">Recent Alerts</h3>
                <Link href="/dashboard/alerts" className="text-xs font-semibold text-blue hover:text-navy">
                  View all
                </Link>
              </div>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No alerts yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-start gap-3 p-3 rounded-xl ${alert.read ? "bg-white" : "bg-blue-pale/50"}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          alert.alertType === "ABNORMAL"
                            ? "bg-red-50 text-red-500"
                            : alert.alertType === "MEDICATION"
                            ? "bg-green-50 text-green-500"
                            : "bg-blue-pale text-blue"
                        }`}
                      >
                        {alert.alertType === "ABNORMAL" ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : alert.alertType === "MEDICATION" ? (
                          <Pill className="w-4 h-4" />
                        ) : (
                          <Calendar className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-navy">{alert.title}</p>
                        <p className="text-xs text-slate-500 truncate">{alert.message}</p>
                      </div>
                      {!alert.read && (
                        <span className="w-2 h-2 bg-blue rounded-full shrink-0 mt-2" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
