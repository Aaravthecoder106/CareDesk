"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  ChevronRight,
  Loader2,
  Search,
  Mail,
  UserPlus,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import PaywallModal from "@/components/PaywallModal";
import type { FamilyMember } from "@/lib/types";

export default function FamilyPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<"existing" | "invite" | "manual">("manual");
  const [searchEmail, setSearchEmail] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualRelationship, setManualRelationship] = useState("parent");
  const [adding, setAdding] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await api.get<{ data: FamilyMember[] }>("/family-members/", token);
        setMembers(res.data || []);
      } catch (err) {
        console.error("Failed to fetch family members:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
  }, [user]);

  const handleAddExisting = async () => {
    if (!searchEmail.trim()) return;
    try {
      setAdding(true);
      const token = await getToken();
      if (!token) return;
      await api.post("/family-members/add-existing", { email: searchEmail }, token);
      setShowAddModal(false);
      setSearchEmail("");
      const res = await api.get<{ data: FamilyMember[] }>("/family-members/", token);
      setMembers(res.data || []);
    } catch (err) {
      if ((err as Error).message?.includes("PAYWALL")) { setShowPaywall(true); } else { alert((err as Error).message || "User not found. They need to sign up first."); }
    } finally {
      setAdding(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      setAdding(true);
      const token = await getToken();
      if (!token) return;
      await api.post("/family-members/invite", { email: inviteEmail }, token);
      alert(`Invitation sent to ${inviteEmail}`);
      setShowAddModal(false);
      setInviteEmail("");
    } catch (err) {
      alert((err as Error).message || "Failed to send invitation");
    } finally {
      setAdding(false);
    }
  };

  const handleAddManual = async () => {
    if (!manualName.trim()) return;
    try {
      setAdding(true);
      const token = await getToken();
      if (!token) return;
      await api.post("/family-members/", { name: manualName, relationship: manualRelationship }, token);
      setShowAddModal(false);
      setManualName("");
      const res = await api.get<{ data: FamilyMember[] }>("/family-members/", token);
      setMembers(res.data || []);
    } catch (err) {
      if ((err as Error).message?.includes("PAYWALL")) { setShowPaywall(true); } else { alert((err as Error).message || "Failed to add member"); }
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Family Members</h1>
          <p className="text-sm text-slate-500 mt-1">Manage health profiles for your family</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-100">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-navy mb-2">No family members yet</h3>
          <p className="text-sm text-slate-500 mb-4">Add family members to track their health data.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <Link
              key={member.id}
              href={`/dashboard/family/${member.id}`}
              className="flex flex-col bg-white p-5 rounded-xl border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-pale rounded-full flex items-center justify-center text-lg font-bold text-blue">
                  {member.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-navy truncate">{member.name}</p>
                  <p className="text-xs text-slate-500">{member.relationship}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-50">
                <span className="text-[11px] text-slate-400">Tap to view details</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>

            <h2 className="text-xl font-bold text-navy mb-2">Add Family Member</h2>
            <p className="text-sm text-slate-500 mb-6">Choose how to add a family member</p>

            {/* Mode Tabs */}
            <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
              <button
                onClick={() => setAddMode("existing")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-colors ${
                  addMode === "existing" ? "bg-white text-navy shadow-sm" : "text-slate-500"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Find User
              </button>
              <button
                onClick={() => setAddMode("invite")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-colors ${
                  addMode === "invite" ? "bg-white text-navy shadow-sm" : "text-slate-500"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Invite
              </button>
              <button
                onClick={() => setAddMode("manual")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-colors ${
                  addMode === "manual" ? "bg-white text-navy shadow-sm" : "text-slate-500"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Manual
              </button>
            </div>

            {/* Find Existing User */}
            {addMode === "existing" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Add someone who already has a CareDesk account. They&apos;ll be linked to your family.
                </p>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Email address</label>
                  <input
                    type="email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="mother@gmail.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue focus:ring-1 focus:ring-blue outline-none"
                  />
                </div>
                <button
                  onClick={handleAddExisting}
                  disabled={!searchEmail.trim() || adding}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy-light transition-colors disabled:opacity-50"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Member"}
                </button>
              </div>
            )}

            {/* Invite by Email */}
            {addMode === "invite" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Send an invitation email. They&apos;ll create an account and be added to your family.
                </p>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Email address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="father@gmail.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue focus:ring-1 focus:ring-blue outline-none"
                  />
                </div>
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || adding}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy-light transition-colors disabled:opacity-50"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Invitation"}
                </button>
              </div>
            )}

            {/* Manual Entry */}
            {addMode === "manual" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Add a family member manually. You can upload reports and track their health.
                </p>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Name</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g. Mom, Dad"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue focus:ring-1 focus:ring-blue outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Relationship</label>
                  <select
                    value={manualRelationship}
                    onChange={(e) => setManualRelationship(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-blue focus:ring-1 focus:ring-blue outline-none"
                  >
                    <option value="parent">Parent</option>
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="sibling">Sibling</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <button
                  onClick={handleAddManual}
                  disabled={!manualName.trim() || adding}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy-light transition-colors disabled:opacity-50"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Member"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} trigger="family" />
    </div>
  );
}
