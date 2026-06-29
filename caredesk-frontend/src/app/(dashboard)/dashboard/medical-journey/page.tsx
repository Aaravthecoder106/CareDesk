"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  ChevronRight,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  Loader2,
  X,
  Pencil,
  Trash2,
  FolderOpen,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Category, JourneyData } from "@/lib/types";

const COLORS = ["#5E78E6", "#22C55E", "#F97316", "#EF4444", "#A855F7", "#06B6D4", "#EC4899", "#EAB308"];

export default function MedicalJourneyPage() {
  const { getToken } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(COLORS[0]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatColor, setEditCatColor] = useState("");
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const [catRes, journeyRes] = await Promise.all([
        api.get<{ data: Category[] }>("/categories", token),
        api.get<{ data: JourneyData }>("/reports/journey", token),
      ]);
      setCategories(catRes.data || []);
      setJourney(journeyRes.data);
    } catch {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      setCreating(true);
      const token = await getToken();
      if (!token) return;
      await api.post("/categories", { name: newCatName.trim(), color: newCatColor }, token);
      setNewCatName("");
      setNewCatColor(COLORS[0]);
      setShowCreateForm(false);
      await loadData();
    } catch {
      console.error("Failed to create category");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateCategory = async (categoryId: string) => {
    if (!editCatName.trim()) return;
    try {
      const token = await getToken();
      if (!token) return;
      await api.patch(`/categories/${categoryId}`, { name: editCatName.trim(), color: editCatColor }, token);
      setEditingCategory(null);
      await loadData();
    } catch {
      console.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Delete this category? Reports will be uncategorized.")) return;
    try {
      const token = await getToken();
      if (!token) return;
      await api.delete(`/categories/${categoryId}`, token);
      if (selectedCategory === categoryId) setSelectedCategory(null);
      await loadData();
    } catch {
      console.error("Failed to delete category");
    }
  };

  const handleAssignCategory = async (reportId: string, categoryId: string | null) => {
    try {
      const token = await getToken();
      if (!token) return;
      await api.post(`/reports/${reportId}/category`, { categoryId }, token);
      await loadData();
    } catch {
      console.error("Failed to assign category");
    }
  };

  const filteredTimeline = journey?.timeline
    .map((month) => ({
      ...month,
      reports: selectedCategory
        ? month.reports.filter((r) => r.categoryId === selectedCategory)
        : month.reports,
    }))
    .filter((month) => month.reports.length > 0) || [];

  const selectedCatName = categories.find((c) => c.id === selectedCategory)?.name;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Medical Journey</h1>
        <p className="text-sm text-slate-500">Your health timeline, organized by category</p>
      </div>

      {/* Categories */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Categories</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-blue hover:text-navy transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewCatColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${newCatColor === c ? "scale-125 ring-2 ring-offset-2 ring-slate-300" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name"
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/20"
                maxLength={50}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
              />
              <button
                onClick={handleCreateCategory}
                disabled={creating || !newCatName.trim()}
                className="px-4 py-2 text-xs font-semibold bg-navy text-white rounded-lg hover:bg-navy-light disabled:opacity-50 transition-colors"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
              </button>
              <button
                onClick={() => { setShowCreateForm(false); setNewCatName(""); }}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === null
                  ? "bg-navy text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              <FileText className="w-4 h-4" />
              All
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${selectedCategory === null ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                {journey?.totalReports || 0}
              </span>
            </button>

            {categories.map((cat) => (
              <div key={cat.id}>
                {editingCategory === cat.id ? (
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                    <input
                      type="color"
                      value={editCatColor}
                      onChange={(e) => setEditCatColor(e.target.value)}
                      className="w-5 h-5 rounded border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      className="w-24 px-1 py-0.5 text-xs border border-slate-200 rounded focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleUpdateCategory(cat.id)}
                    />
                    <button onClick={() => handleUpdateCategory(cat.id)} className="text-xs font-semibold text-blue hover:text-navy">Save</button>
                    <button onClick={() => setEditingCategory(null)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                  </div>
                ) : (
                  <div className="group relative">
                    <button
                      onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedCategory === cat.id
                          ? "text-white shadow-sm"
                          : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                      style={selectedCategory === cat.id ? { backgroundColor: cat.color } : undefined}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedCategory === cat.id ? "#fff" : cat.color }} />
                      {cat.name}
                      <span className={`text-xs px-1.5 py-0.5 rounded-md ${selectedCategory === cat.id ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                        {cat._count?.reports || 0}
                      </span>
                    </button>
                    <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingCategory(cat.id); setEditCatName(cat.name); setEditCatColor(cat.color); }}
                        className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50"
                      >
                        <Pencil className="w-2.5 h-2.5 text-slate-400" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                        className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-red-50"
                      >
                        <Trash2 className="w-2.5 h-2.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!showCreateForm && categories.length < 20 && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm text-slate-400 border border-dashed border-slate-300 hover:border-slate-400 hover:text-slate-500 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          {selectedCatName ? `Reports in ${selectedCatName}` : "All Reports"}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
          </div>
        ) : filteredTimeline.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm text-slate-500 mb-4">No reports yet</p>
            <Link
              href="/dashboard/reports"
              className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy-light transition-colors"
            >
              Upload your first report
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-slate-200" />
            <div className="space-y-8">
              {filteredTimeline.map((month) => (
                <div key={month.month}>
                  <div className="flex items-center gap-3 mb-4 relative">
                    <div className="w-10 h-10 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center z-10">
                      <Calendar className="w-4 h-4 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-700">{month.label}</h3>
                  </div>
                  <div className="space-y-3 ml-[19px] pl-8 border-l border-transparent">
                    {month.reports.map((report) => (
                      <div
                        key={report.id}
                        className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            report.processed ? "bg-emerald-50" : "bg-amber-50"
                          }`}>
                            {report.processed ? (
                              <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                            ) : (
                              <Clock className="w-4.5 h-4.5 text-amber-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/dashboard/reports/${report.id}`}
                              className="text-sm font-medium text-slate-900 hover:text-blue truncate block"
                            >
                              {report.fileName}
                            </Link>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(report.uploadDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              {" · "}
                              {(report.fileSize / 1024 / 1024).toFixed(1)}MB
                            </p>
                          </div>
                          <select
                            value={report.categoryId || ""}
                            onChange={(e) => handleAssignCategory(report.id, e.target.value || null)}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-500 focus:outline-none focus:border-blue opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <option value="">No category</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                        </div>
                        {report.aiSummary && (
                          <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">{report.aiSummary}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
