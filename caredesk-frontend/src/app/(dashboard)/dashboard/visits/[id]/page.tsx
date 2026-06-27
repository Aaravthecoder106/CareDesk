"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Stethoscope,
  MessageSquare,
  Loader2,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Visit } from "@/lib/types";

export default function VisitDetailPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const params = useParams();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVisit() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await api.get<{ data: Visit }>(`/visits/${params.id}`, token);
        setVisit(res.data);
      } catch (err) {
        console.error("Failed to fetch visit:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchVisit();
  }, [user, params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-blue animate-spin" />
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Visit not found</p>
        <Link href="/dashboard/visits" className="text-sm font-semibold text-blue mt-4 inline-block">
          Back to visits
        </Link>
      </div>
    );
  }

  const questions = visit.parsedQuestions
    ? typeof visit.parsedQuestions === "string"
      ? JSON.parse(visit.parsedQuestions)
      : visit.parsedQuestions
    : null;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/visits"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to visits
      </Link>

      {/* Visit Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-navy/10 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-navy" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">
              {visit.doctorName || "Doctor Visit"}
            </h1>
            <p className="text-sm text-slate-500">
              {new Date(visit.visitDate).toLocaleDateString()} &middot; {visit.specialty || "General"}
            </p>
          </div>
        </div>

        {/* Symptoms */}
        {visit.symptoms && visit.symptoms.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-medium text-slate-500 mb-2">Symptoms</h3>
            <div className="flex flex-wrap gap-2">
              {visit.symptoms.map((symptom, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-full"
                >
                  {symptom}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {visit.notes && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl">
            <h3 className="text-xs font-medium text-slate-500 mb-2">Notes</h3>
            <p className="text-sm text-navy whitespace-pre-wrap">{visit.notes}</p>
          </div>
        )}
      </div>

      {/* AI Summary */}
      {visit.summary && (
        <div className="bg-gradient-to-br from-navy to-blue rounded-xl p-6 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-sm font-semibold">AI Visit Summary</h2>
          </div>
          <p className="text-sm leading-relaxed opacity-90">{visit.summary}</p>
        </div>
      )}

      {/* Generated Questions */}
      {questions && questions.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-blue" />
            <h2 className="text-sm font-semibold text-navy">Questions for Your Doctor</h2>
          </div>
          <div className="space-y-3">
            {questions.map((q: string, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-blue-pale/50 rounded-xl">
                <span className="w-6 h-6 bg-blue text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-navy">{q}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
