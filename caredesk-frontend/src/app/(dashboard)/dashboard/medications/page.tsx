"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Pill,
  Plus,
  Clock,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Medication, PaginatedResponse } from "@/lib/types";

export default function MedicationsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMedications() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await api.get<PaginatedResponse<Medication>>("/medications/", token);
        setMedications(res.data || []);
      } catch (err) {
        console.error("Failed to fetch medications:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMedications();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Medications</h1>
          <p className="text-sm text-slate-500 mt-1">Track medication adherence and manage reminders</p>
        </div>
        <Link
          href="/dashboard/medications/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Medication
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue animate-spin" />
        </div>
      ) : medications.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-100">
          <Pill className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-navy mb-2">No medications yet</h3>
          <p className="text-sm text-slate-500 mb-4">Add your medications to receive daily reminders and track adherence.</p>
          <Link
            href="/dashboard/medications/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Medication
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {medications.map((med) => (
            <div
              key={med.id}
              className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100"
            >
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <Pill className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy">{med.name}</p>
                <p className="text-xs text-slate-500">
                  {med.dosage} &middot; {med.frequency}
                  {med.timeOfDay && ` &middot; ${med.timeOfDay}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {med.notes && (
                  <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full max-w-[100px] truncate">
                    Has notes
                  </span>
                )}
                {med.reminderEnabled && (
                  <Clock className="w-4 h-4 text-blue" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
