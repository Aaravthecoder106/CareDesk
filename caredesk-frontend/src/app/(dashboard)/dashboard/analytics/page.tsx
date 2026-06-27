"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  Activity,
  FileText,
  Calendar,
  Pill,
  Bell,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { TimelineEvent } from "@/lib/types";

export default function TimelinePage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const familyMemberId = "";

  useEffect(() => {
    async function fetchTimeline() {
      try {
        const token = await getToken();
        if (!token) return;
        const query = familyMemberId ? `?familyMemberId=${familyMemberId}` : "";
        const res = await api.get<{ data: TimelineEvent[] }>(`/timeline/${query}`, token);
        setEvents(res.data || []);
      } catch (err) {
        console.error("Failed to fetch timeline:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTimeline();
  }, [user, familyMemberId]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "REPORT":
        return <FileText className="w-4 h-4 text-blue" />;
      case "VISIT":
        return <Calendar className="w-4 h-4 text-navy" />;
      case "MEDICATION":
        return <Pill className="w-4 h-4 text-green-500" />;
      case "ALERT":
        return <Bell className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-slate-500" />;
    }
  };

  const getEventBg = (type: string) => {
    switch (type) {
      case "REPORT":
        return "bg-blue-pale";
      case "VISIT":
        return "bg-navy/10";
      case "MEDICATION":
        return "bg-green-50";
      case "ALERT":
        return "bg-red-50";
      default:
        return "bg-slate-100";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">A chronological view of all health events</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-100">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-navy mb-2">No events yet</h3>
          <p className="text-sm text-slate-500">Upload reports or log visits to see them on the timeline.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />
          <div className="space-y-6">
            {events.map((event) => (
              <div key={event.id} className="flex gap-4 relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 ${getEventBg(event.type)}`}>
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 bg-white p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-navy">{event.title}</p>
                    <span className="text-[11px] text-slate-400">
                      {new Date(event.date).toLocaleDateString()}
                    </span>
                  </div>
                  {event.description && (
                    <p className="text-xs text-slate-500 mt-1">{event.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
