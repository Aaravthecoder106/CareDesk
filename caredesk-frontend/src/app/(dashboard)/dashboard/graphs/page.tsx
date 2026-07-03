"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import type { GraphDataPoint } from "@/lib/types";

const metrics = [
  { id: "systolic", label: "Systolic BP", unit: "mmHg", normalLow: 90, normalHigh: 120 },
  { id: "diastolic", label: "Diastolic BP", unit: "mmHg", normalLow: 60, normalHigh: 80 },
  { id: "heartRate", label: "Heart Rate", unit: "bpm", normalLow: 60, normalHigh: 100 },
  { id: "weight", label: "Weight", unit: "kg", normalLow: 45, normalHigh: 90 },
  { id: "glucose", label: "Glucose", unit: "mg/dL", normalLow: 70, normalHigh: 140 },
  { id: "hba1c", label: "HbA1c", unit: "%", normalLow: 4.0, normalHigh: 5.7 },
  { id: "cholesterol", label: "Total Cholesterol", unit: "mg/dL", normalLow: 100, normalHigh: 200 },
  { id: "ldl", label: "LDL Cholesterol", unit: "mg/dL", normalLow: 0, normalHigh: 100 },
  { id: "hdl", label: "HDL Cholesterol", unit: "mg/dL", normalLow: 40, normalHigh: 999 },
  { id: "triglycerides", label: "Triglycerides", unit: "mg/dL", normalLow: 0, normalHigh: 150 },
  { id: "creatinine", label: "Creatinine", unit: "mg/dL", normalLow: 0.6, normalHigh: 1.2 },
];

type TrendDirection = "improving" | "stable" | "worsening";

function computeTrend(data: GraphDataPoint[]): { direction: TrendDirection; label: string } {
  if (data.length < 2) return { direction: "stable", label: "Need more data" };
  const recent = data.slice(-3);
  const avgRecent = recent.reduce((s, d) => s + d.value, 0) / recent.length;
  const older = data.slice(0, -2);
  const avgOlder = older.length > 0 ? older.reduce((s, d) => s + d.value, 0) / older.length : avgRecent;
  const diff = avgRecent - avgOlder;
  const threshold = avgOlder * 0.05;
  if (diff > threshold) return { direction: "worsening", label: "Worsening" };
  if (diff < -threshold) return { direction: "improving", label: "Improving" };
  return { direction: "stable", label: "Stable" };
}

export default function GraphsPage() {
  const { getToken } = useAuth();
  const [data, setData] = useState<GraphDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState("systolic");

  useEffect(() => {
    async function fetchGraphData() {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        const res = await api.get<{ data: GraphDataPoint[] }>(
          `/graphs/metrics?metric=${selectedMetric}`,
          token
        );
        setData(res.data || []);
      } catch (err) {
        console.error("Failed to fetch graph data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchGraphData();
  }, [selectedMetric]);

  const currentMetric = metrics.find((m) => m.id === selectedMetric);
  const latestValue = data.length > 0 ? data[data.length - 1].value : null;
  const trend = useMemo(() => computeTrend(data), [data]);
  const abnormalCount = data.filter((d) => d.isAbnormal).length;

  const trendConfig: Record<TrendDirection, { icon: typeof TrendingUp; color: string; bg: string }> = {
    improving: { icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    stable: { icon: Minus, color: "text-slate-500", bg: "bg-slate-50" },
    worsening: { icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" },
  };

  const trendInfo = trendConfig[trend.direction];
  const TrendIcon = trendInfo.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Health Graphs</h1>
        <p className="text-sm text-slate-500 mt-1">Visualize your health trends over time</p>
      </div>

      {/* Metric Selector */}
      <div className="flex flex-wrap gap-2">
        {metrics.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMetric(m.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              selectedMetric === m.id
                ? "bg-navy text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Stats Row */}
      {latestValue !== null && currentMetric && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current Value */}
          <div className="bg-white rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-pale rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Latest</p>
                <p className="text-lg font-bold text-navy">
                  {latestValue} <span className="text-xs font-normal text-slate-400">{currentMetric.unit}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Trend */}
          <div className={`rounded-xl p-4 border ${trendInfo.bg} border-transparent`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${trendInfo.bg}`}>
                <TrendIcon className={`w-5 h-5 ${trendInfo.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Trend</p>
                <p className={`text-sm font-bold ${trendInfo.color}`}>{trend.label}</p>
              </div>
            </div>
          </div>

          {/* Normal Range */}
          <div className="bg-white rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <Minus className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Normal Range</p>
                <p className="text-sm font-bold text-navy">
                  {currentMetric.normalLow} – {currentMetric.normalHigh} <span className="text-xs font-normal text-slate-400">{currentMetric.unit}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Abnormal Count */}
          <div className={`rounded-xl p-4 border ${abnormalCount > 0 ? "bg-red-50 border-red-100" : "bg-white border-slate-100"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${abnormalCount > 0 ? "bg-red-100" : "bg-slate-50"}`}>
                <AlertTriangle className={`w-5 h-5 ${abnormalCount > 0 ? "text-red-500" : "text-slate-400"}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Abnormal</p>
                <p className={`text-lg font-bold ${abnormalCount > 0 ? "text-red-500" : "text-slate-400"}`}>
                  {abnormalCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-xl p-6 border border-slate-100">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-blue animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-navy mb-2">No data yet</h3>
            <p className="text-sm text-slate-500">Upload reports to see your health trends visualized.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="normalBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                }}
                labelFormatter={(v) => new Date(v).toLocaleDateString()}
                formatter={(value, name, props) => {
                  const point = props?.payload as GraphDataPoint | undefined;
                  const abnormal = point?.isAbnormal ? " ⚠️" : "";
                  return [`${value} ${currentMetric?.unit}${abnormal}`, currentMetric?.label];
                }}
              />
              {/* Normal range reference lines */}
              {currentMetric && (
                <>
                  <ReferenceLine
                    y={currentMetric.normalHigh}
                    stroke="#22c55e"
                    strokeDasharray="5 5"
                    strokeOpacity={0.5}
                    label={{ value: "High", position: "right", fill: "#22c55e", fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={currentMetric.normalLow}
                    stroke="#22c55e"
                    strokeDasharray="5 5"
                    strokeOpacity={0.5}
                    label={{ value: "Low", position: "right", fill: "#22c55e", fontSize: 10 }}
                  />
                </>
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke="#5E78E6"
                strokeWidth={2.5}
                fill="url(#normalBand)"
                dot={(props) => {
                  const { cx, cy, payload } = props as { cx: number; cy: number; payload: GraphDataPoint };
                  return (
                    <circle
                      key={`dot-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={payload?.isAbnormal ? "#ef4444" : "#5E78E6"}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 6, stroke: "#5E78E6", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
