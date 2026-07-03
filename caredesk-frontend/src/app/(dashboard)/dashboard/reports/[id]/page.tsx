"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Loader2,
  Activity,
  CheckCircle,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Report, PaginatedResponse } from "@/lib/types";

export default function ReportDetailPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const params = useParams();
  const [report, setReport] = useState<Report | null>(null);
  const [prevMetrics, setPrevMetrics] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await api.get<{ data: Report }>(`/reports/${params.id}`, token);
        setReport(res.data);

        if (res.data.processed) {
          const allRes = await api.get<PaginatedResponse<Report>>("/reports/?page=1&limit=10", token).catch(() => null);
          if (allRes?.data) {
            const currentIdx = allRes.data.findIndex((r) => r.id === params.id);
            if (currentIdx >= 0 && currentIdx < allRes.data.length - 1) {
              const prev = allRes.data[currentIdx + 1];
              if (prev.parsedMetrics) {
                const m = typeof prev.parsedMetrics === "string" ? JSON.parse(prev.parsedMetrics) : prev.parsedMetrics;
                setPrevMetrics(m);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch report:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [user, params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-blue animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Report not found</p>
        <Link href="/dashboard/reports" className="text-sm font-semibold text-blue mt-4 inline-block">
          Back to reports
        </Link>
      </div>
    );
  }

  const metrics = report.parsedMetrics
    ? typeof report.parsedMetrics === "string"
      ? JSON.parse(report.parsedMetrics)
      : report.parsedMetrics
    : null;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/reports"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to reports
      </Link>

      {/* Report Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              report.processed ? "bg-green-50" : "bg-orange-50"
            }`}>
              {report.processed ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <Clock className="w-6 h-6 text-orange-500" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy">{report.fileName}</h1>
              <p className="text-sm text-slate-500">
                Uploaded {new Date(report.uploadDate).toLocaleDateString()} &middot;{" "}
                {(report.fileSize / 1024 / 1024).toFixed(1)}MB
              </p>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-sm font-semibold text-navy rounded-lg hover:bg-slate-200 transition-colors">
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      {/* AI Summary */}
      {report.aiSummary && (
        <div className="bg-gradient-to-br from-navy to-blue rounded-xl p-6 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5" />
            <h2 className="text-sm font-semibold">AI Summary</h2>
          </div>
          <p className="text-sm leading-relaxed opacity-90">{report.aiSummary}</p>
        </div>
      )}

      {/* Parsed Metrics */}
      {metrics && (
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h2 className="text-sm font-semibold text-navy mb-4">Extracted Health Metrics</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(metrics).map(([key, value]) => {
              const prevValue = prevMetrics?.[key];
              let trend: "up" | "down" | "same" | null = null;
              if (prevValue !== undefined && prevValue !== null && typeof value === "number" && typeof prevValue === "number") {
                const diff = value - prevValue;
                if (Math.abs(diff) > 0.01) trend = diff > 0 ? "up" : "down";
                else trend = "same";
              }
              return (
                <div key={key} className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-navy">{String(value)}</p>
                    {trend === "up" && <span className="text-xs font-semibold text-red-500">&#9650;</span>}
                    {trend === "down" && <span className="text-xs font-semibold text-green-500">&#9660;</span>}
                    {trend === "same" && <span className="text-xs text-slate-400">&#9644;</span>}
                  </div>
                  {prevValue !== undefined && prevValue !== null && (
                    <p className="text-[10px] text-slate-400 mt-0.5">prev: {String(prevValue)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Report Viewer */}
      {report.fileUrl && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-navy">Report Document</h2>
          </div>
          <div className="aspect-[8.5/11] bg-slate-50">
            <iframe
              src={report.fileUrl}
              className="w-full h-full"
              title="Report viewer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
