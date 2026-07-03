"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Plus,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Visit, PaginatedResponse } from "@/lib/types";

export default function VisitsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVisits() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await api.get<PaginatedResponse<Visit>>("/visits/", token);
        setVisits(res.data || []);
      } catch (err) {
        console.error("Failed to fetch visits:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchVisits();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Doctor Visits</h1>
          <p className="text-sm text-slate-500 mt-1">Track symptoms, prepare questions, and save visit notes</p>
        </div>
        <Link
          href="/dashboard/visits/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          Log Visit
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue animate-spin" />
        </div>
      ) : visits.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-100">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-navy mb-2">No visits logged</h3>
          <p className="text-sm text-slate-500 mb-4">Log your first doctor visit to get AI-powered questions and summaries.</p>
          <Link
            href="/dashboard/visits/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log Visit
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <Link
              key={visit.id}
              href={`/dashboard/visits/${visit.id}`}
              className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 bg-blue-pale rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy">
                  {visit.doctorName || "Doctor Visit"}
                  {visit.specialty && <span className="font-normal text-slate-500"> &middot; {visit.specialty}</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(visit.visitDate).toLocaleDateString()} &middot; {visit.symptoms.length} symptoms
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                {visit.parsedQuestions && visit.parsedQuestions.length > 0 && (
                  <span className="text-[10px] font-medium bg-green-50 text-green-600 px-2 py-1 rounded-full">
                    {visit.parsedQuestions.length} questions
                  </span>
                )}
                {visit.summary && (
                  <span className="text-[10px] font-medium bg-blue-pale text-blue px-2 py-1 rounded-full">
                    Summarized
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
