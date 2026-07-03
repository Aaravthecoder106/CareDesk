"use client";

import { useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Pill,
  Loader2,
  CheckCircle,
  Calendar,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import type { FamilyMember, PaginatedResponse } from "@/lib/types";

const FREQUENCIES = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
  "Once weekly",
  "As needed",
];

const TIMES_OF_DAY = [
  "Morning",
  "Afternoon",
  "Evening",
  "Night",
  "With meals",
  "Before bed",
];

export default function NewMedicationPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Once daily");
  const [timeOfDay, setTimeOfDay] = useState("Morning");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState("");

  useEffect(() => {
    async function fetchMembers() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await api.get<PaginatedResponse<FamilyMember>>("/family-members/?page=1&limit=50", token);
        setFamilyMembers(res.data || []);
        if (res.data?.length > 0) {
          setSelectedMember(res.data[0].id);
        }
      } catch {}
    }
    fetchMembers();
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) return setError("Please enter medication name");
    if (!dosage.trim()) return setError("Please enter dosage");
    if (!selectedMember) return setError("Please select a family member");

    try {
      setLoading(true);
      setError("");
      const token = await getToken();
      if (!token) return;

      await api.post("/medications", {
        familyMemberId: selectedMember,
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        timeOfDay,
        startDate,
        notes: notes.trim() || undefined,
        reminderEnabled,
      }, token);

      router.push("/dashboard/medications");
    } catch (err) {
      setError((err as Error).message || "Failed to add medication");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Add Medication</h1>
        <p className="text-sm text-slate-500 mt-1">Track medications with dosage and reminders</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
      )}

      {/* Family Member */}
      {familyMembers.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <label className="text-sm font-semibold text-navy mb-3 block">Who is this medication for?</label>
          <div className="flex flex-wrap gap-2">
            {familyMembers.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMember(m.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedMember === m.id
                    ? "bg-navy text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Medication Details */}
      <div className="bg-white rounded-xl p-6 border border-slate-100 space-y-4">
        <div>
          <label className="text-sm font-semibold text-navy mb-3 block">
            <Pill className="w-4 h-4 inline mr-2" />
            Medication Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Metformin, Ibuprofen"
            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-blue"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-navy mb-3 block">Dosage</label>
          <input
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="e.g. 500mg, 2 tablets"
            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-blue"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-navy mb-3 block">
              <Clock className="w-4 h-4 inline mr-2" />
              Frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-blue bg-white"
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-navy mb-3 block">Time of Day</label>
            <select
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-blue bg-white"
            >
              {TIMES_OF_DAY.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-navy mb-3 block">
            <Calendar className="w-4 h-4 inline mr-2" />
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-blue"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-navy mb-3 block">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional instructions..."
            rows={3}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-blue resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setReminderEnabled(!reminderEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              reminderEnabled ? "bg-navy" : "bg-slate-200"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                reminderEnabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-sm text-slate-600">Enable daily reminder</span>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || !name.trim() || !dosage.trim()}
        className="w-full py-3 bg-navy text-white font-semibold rounded-lg hover:bg-navy-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Adding...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4" />
            Add Medication
          </>
        )}
      </button>
    </div>
  );
}
