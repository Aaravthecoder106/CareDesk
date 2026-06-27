"use client";

import { X, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatUSD } from "@/lib/pricing";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: "report" | "family" | "alert" | "general";
}

const paywallContent = {
  report: {
    title: "Upload Limit Reached",
    description: "You've used all 3 free report uploads. Upgrade to continue uploading and get AI-powered analysis.",
    icon: "📊",
  },
  family: {
    title: "Family Member Limit",
    description: "Free plan allows 1 family member. Upgrade to manage more family members with separate health profiles.",
    icon: "👨‍👩‍👧‍👦",
  },
  alert: {
    title: "Full Alerts Require Premium",
    description: "Get detailed abnormality alerts, medication reminders, and trend analysis with a paid plan.",
    icon: "🔔",
  },
  general: {
    title: "Upgrade Your Plan",
    description: "Unlock more features including additional family members, unlimited reports, and AI analysis.",
    icon: "✨",
  },
};

export default function PaywallModal({ isOpen, onClose, trigger }: PaywallModalProps) {
  if (!isOpen) return null;

  const content = paywallContent[trigger];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100">
          <X className="w-5 h-5 text-slate-400" />
        </button>

        <div className="text-center mb-6">
          <span className="text-4xl mb-4 block">{content.icon}</span>
          <h2 className="text-xl font-bold text-navy mb-2">{content.title}</h2>
          <p className="text-sm text-slate-500">{content.description}</p>
        </div>

        <div className="space-y-3 mb-6">
          {/* Basic */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Basic</p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-navy">{formatUSD(4.99)}</span>
              <span className="text-sm text-slate-500">/month</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">or {formatUSD(39)}/year — save 28%</p>
            <ul className="mt-2 space-y-0.5">
              {["2 family members", "10 report uploads", "AI analysis + trends"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />{f}
                </li>
              ))}
            </ul>
          </div>

          {/* Premium */}
          <div className="bg-blue-pale/30 rounded-xl p-4 border-2 border-navy relative">
            <span className="absolute -top-3 left-4 px-2 py-0.5 bg-navy text-white text-[10px] font-bold rounded-full">Best Value</span>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Premium</p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-navy">{formatUSD(12.99)}</span>
              <span className="text-sm text-slate-500">/month</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">or {formatUSD(99)}/year — save 33%</p>
            <ul className="mt-2 space-y-0.5">
              {["4 family members", "Unlimited reports", "Full AI analysis", "Trend graphs", "Abnormality alerts"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />{f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Link
          href="/dashboard/settings"
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full py-3 bg-navy text-white font-semibold rounded-lg hover:bg-navy-light transition-colors"
        >
          View All Plans
          <ArrowRight className="w-4 h-4" />
        </Link>

        <button onClick={onClose} className="w-full mt-3 py-2 text-sm font-semibold text-slate-500 hover:text-navy transition-colors">
          Maybe later
        </button>
      </div>
    </div>
  );
}
