"use client";

import { useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Plus,
  X,
  Loader2,
  CheckCircle,
  User,
  Stethoscope,
  Search,
} from "lucide-react";
import { api } from "@/lib/api";
import type { FamilyMember, PaginatedResponse } from "@/lib/types";

const SUGGESTED_SYMPTOMS = [
  "Headache", "Fever", "Cough", "Fatigue", "Dizziness",
  "Chest Pain", "Shortness of Breath", "Back Pain", "Nausea",
  "Joint Pain", "Sore Throat", "Blurred Vision", "Numbness",
  "Swelling", "Insomnia", "Anxiety", "Weight Loss", "Weight Gain",
];

const SPECIALTIES = [
  "GENERAL", "CARDIOLOGY", "NEUROLOGY", "ORTHOPEDICS", "PEDIATRICS",
  "DERMATOLOGY", "OPHTHALMOLOGY", "ENT", "GASTROENTEROLOGY",
  "PULMONOLOGY", "ENDOCRINOLOGY",
];

export default function NewVisitPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [visitDate, setVisitDate] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [specialty, setSpecialty] = useState("GENERAL");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomInput, setSymptomInput] = useState("");
  const [showSymptomSuggestions, setShowSymptomSuggestions] = useState(false);

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

  const addSymptom = (symptom: string) => {
    const trimmed = symptom.trim();
    if (trimmed && !symptoms.includes(trimmed)) {
      setSymptoms([...symptoms, trimmed]);
    }
    setSymptomInput("");
    setShowSymptomSuggestions(false);
  };

  const removeSymptom = (symptom: string) => {
    setSymptoms(symptoms.filter((s) => s !== symptom));
  };

  const filteredSuggestions = SUGGESTED_SYMPTOMS.filter(
    (s) =>
      s.toLowerCase().includes(symptomInput.toLowerCase()) &&
      !symptoms.includes(s)
  );

  const handleSubmit = async () => {
    if (!visitDate) return setError("Please select a visit date");
    if (symptoms.length === 0) return setError("Please add at least one symptom");

    try {
      setLoading(true);
      setError("");
      const token = await getToken();
      if (!token) return;

      const body: Record<string, unknown> = {
        visitDate,
        symptoms,
      };
      if (doctorName.trim()) body.doctorName = doctorName.trim();
      if (specialty) body.specialty = specialty;
      if (selectedMember) body.familyMemberId = selectedMember;

      const res = await api.post<{ data: { id: string } }>("/visits", body, token);
      router.push(`/dashboard/visits/${res.data.id}`);
    } catch (err) {
      setError((err as Error).message || "Failed to create visit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Log Doctor Visit</h1>
        <p className="text-sm text-slate-500 mt-1">Record your visit to get AI-powered questions and summaries</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
      )}

      {/* Family Member */}
      {familyMembers.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <label className="text-sm font-semibold text-navy mb-3 block">Who is this visit for?</label>
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

      {/* Visit Date */}
      <div className="bg-white rounded-xl p-6 border border-slate-100">
        <label className="text-sm font-semibold text-navy mb-3 block">
          <Calendar className="w-4 h-4 inline mr-2" />
          Visit Date
        </label>
        <input
          type="date"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-blue"
        />
      </div>

      {/* Doctor Info */}
      <div className="bg-white rounded-xl p-6 border border-slate-100 space-y-4">
        <div>
          <label className="text-sm font-semibold text-navy mb-3 block">
            <User className="w-4 h-4 inline mr-2" />
            Doctor Name (optional)
          </label>
          <input
            type="text"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            placeholder="Dr. Smith"
            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-blue"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-navy mb-3 block">
            <Stethoscope className="w-4 h-4 inline mr-2" />
            Specialty
          </label>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-blue bg-white"
          >
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Symptoms */}
      <div className="bg-white rounded-xl p-6 border border-slate-100">
        <label className="text-sm font-semibold text-navy mb-3 block">
          Symptoms
          <span className="font-normal text-slate-400 ml-1">(at least 1)</span>
        </label>

        {/* Selected symptoms */}
        {symptoms.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {symptoms.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-pale text-blue text-sm font-medium rounded-full"
              >
                {s}
                <button onClick={() => removeSymptom(s)} className="hover:text-navy">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={symptomInput}
                onChange={(e) => {
                  setSymptomInput(e.target.value);
                  setShowSymptomSuggestions(true);
                }}
                onFocus={() => setShowSymptomSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSymptom(symptomInput);
                  }
                }}
                placeholder="Type a symptom..."
                className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-blue"
              />
            </div>
            <button
              onClick={() => addSymptom(symptomInput)}
              className="px-4 py-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Suggestions dropdown */}
          {showSymptomSuggestions && symptomInput.length === 0 && (
            <div className="absolute z-10 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredSuggestions.slice(0, 8).map((s) => (
                <button
                  key={s}
                  onClick={() => addSymptom(s)}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || !visitDate || symptoms.length === 0}
        className="w-full py-3 bg-navy text-white font-semibold rounded-lg hover:bg-navy-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4" />
            Log Visit
          </>
        )}
      </button>
    </div>
  );
}
