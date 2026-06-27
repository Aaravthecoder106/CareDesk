"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import ReportUploader from "@/components/ReportUploader";
import PaywallModal from "@/components/PaywallModal";
import type { Report, PaginatedResponse } from "@/lib/types";

export default function ReportsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    async function fetchReports() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await api.get<PaginatedResponse<Report>>("/reports/?page=1&limit=20", token);
        setReports(res.data || []);
      } catch (err) {
        console.error("Failed to fetch reports:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [user]);

  const handleUploadComplete = async () => {
    const token = await getToken();
    if (!token) return;
    const res = await api.get<PaginatedResponse<Report>>("/reports/?page=1&limit=20", token);
    setReports(res.data || []);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Upload and manage your medical reports</p>
      </div>

      <ReportUploader onUploadComplete={handleUploadComplete} onError={(err) => { if (err.includes("PAYWALL")) setShowPaywall(true); }} />

      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} trigger="report" />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue animate-spin" />
        </div>
      ) : reports.length === 0 ? null : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-navy">Previous Reports</h3>
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/dashboard/reports/${report.id}`}
              className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  report.processed ? "bg-green-50 text-green-500" : "bg-orange-50 text-orange-500"
                }`}
              >
                {report.processed ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy truncate">{report.fileName}</p>
                <p className="text-xs text-slate-500">
                  {new Date(report.uploadDate).toLocaleDateString()} &middot;{" "}
                  {(report.fileSize / 1024 / 1024).toFixed(1)}MB
                </p>
              </div>
              {report.aiSummary && (
                <p className="hidden md:block text-xs text-slate-500 truncate max-w-xs">
                  {report.aiSummary}
                </p>
              )}
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
