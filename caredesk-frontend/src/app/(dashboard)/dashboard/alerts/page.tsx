"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  Bell,
  AlertTriangle,
  Calendar,
  Pill,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Alert, PaginatedResponse } from "@/lib/types";

export default function AlertsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const token = await getToken();
        if (!token) return;
        const query = filter === "unread" ? "?unreadOnly=true" : "";
        const res = await api.get<PaginatedResponse<Alert>>(`/alerts/${query}`, token);
        setAlerts(res.data || []);
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, [user, filter]);

  const markRead = async (id: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      await api.patch(`/alerts/${id}/read`, {}, token);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, read: true } : a))
      );
    } catch (err) {
      console.error("Failed to mark alert read:", err);
    }
  };

  const markAllRead = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      await api.post("/alerts/read-all", {}, token);
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "ABNORMAL":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "MEDICATION":
        return <Pill className="w-5 h-5 text-green-500" />;
      case "APPOINTMENT":
        return <Calendar className="w-5 h-5 text-blue" />;
      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  const getAlertBg = (type: string) => {
    switch (type) {
      case "ABNORMAL":
        return "bg-red-50";
      case "MEDICATION":
        return "bg-green-50";
      case "APPOINTMENT":
        return "bg-blue-pale";
      default:
        return "bg-slate-50";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Alerts</h1>
          <p className="text-sm text-slate-500 mt-1">Stay on top of your health with timely notifications</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filter === "all" ? "bg-white text-navy shadow-sm" : "text-slate-500"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filter === "unread" ? "bg-white text-navy shadow-sm" : "text-slate-500"
              }`}
            >
              Unread
            </button>
          </div>
          <button
            onClick={markAllRead}
            className="text-xs font-semibold text-blue hover:text-navy"
          >
            Mark all read
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-100">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-navy mb-2">No alerts</h3>
          <p className="text-sm text-slate-500">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-4 bg-white p-4 rounded-xl border border-slate-100 ${
                !alert.read ? "ring-1 ring-blue/20" : ""
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getAlertBg(alert.alertType)}`}>
                {getAlertIcon(alert.alertType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-navy">{alert.title}</p>
                  {!alert.read && <span className="w-2 h-2 bg-blue rounded-full" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">{alert.message}</p>
                <p className="text-[11px] text-slate-400 mt-2">
                  {new Date(alert.createdAt).toLocaleString()}
                </p>
              </div>
              {!alert.read && (
                <button
                  onClick={() => markRead(alert.id)}
                  className="p-2 rounded-lg hover:bg-slate-50"
                  title="Mark as read"
                >
                  <CheckCircle className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
