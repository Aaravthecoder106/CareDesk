"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Pill,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { FamilyMember } from "@/lib/types";

export default function FamilyDetailPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const params = useParams();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMember() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await api.get<{ data: FamilyMember }>(`/family-members/${params.id}`, token);
        setMember(res.data);
      } catch (err) {
        console.error("Failed to fetch member:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMember();
  }, [user, params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-blue animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Member not found</p>
        <Link href="/dashboard/family" className="text-sm font-semibold text-blue mt-4 inline-block">
          Back to family
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/family"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to family
      </Link>

      <div className="bg-white rounded-xl p-6 border border-slate-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-pale rounded-full flex items-center justify-center text-xl font-bold text-blue">
            {member.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy">{member.name}</h1>
            <p className="text-sm text-slate-500">{member.relationship}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Date of Birth</p>
            <p className="text-sm font-semibold text-navy">
              {member.dateOfBirth
                ? new Date(member.dateOfBirth).toLocaleDateString()
                : "Not provided"}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Gender</p>
            <p className="text-sm font-semibold text-navy">{member.gender || "Not provided"}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Blood Group</p>
            <p className="text-sm font-semibold text-navy">{member.bloodGroup || "Not provided"}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Allergies</p>
            <p className="text-sm font-semibold text-navy">
              {member.allergies?.length ? member.allergies.join(", ") : "None listed"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Link
          href={`/dashboard/reports?memberId=${member.id}`}
          className="flex items-center gap-3 bg-white p-5 rounded-xl border border-slate-100 hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 bg-blue-pale rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue" />
          </div>
          <div>
            <p className="text-sm font-semibold text-navy">Reports</p>
            <p className="text-xs text-slate-500">View medical reports</p>
          </div>
        </Link>
        <Link
          href={`/dashboard/visits?memberId=${member.id}`}
          className="flex items-center gap-3 bg-white p-5 rounded-xl border border-slate-100 hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 bg-navy/10 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-navy" />
          </div>
          <div>
            <p className="text-sm font-semibold text-navy">Visits</p>
            <p className="text-xs text-slate-500">View doctor visits</p>
          </div>
        </Link>
        <Link
          href={`/dashboard/medications?memberId=${member.id}`}
          className="flex items-center gap-3 bg-white p-5 rounded-xl border border-slate-100 hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <Pill className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-navy">Medications</p>
            <p className="text-xs text-slate-500">View medications</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
