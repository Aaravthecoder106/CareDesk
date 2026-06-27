"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import {
  User,
  CreditCard,
  Shield,
  Bell,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { USD_PLANS, formatUSD } from "@/lib/pricing";

export default function SettingsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("FREE");
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await api.get<{ plan: string; expiresAt: string | null }>("/subscription/status", token);
        setCurrentPlan(res.plan);
      } catch {}
    };
    fetchPlan();
  }, [getToken]);

  const isPremium = currentPlan === "BASIC" || currentPlan === "PREMIUM" || currentPlan === "FAMILY";

  const handleCheckout = async (selectedPlan: "basic" | "premium" | "family") => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const currency = Intl.DateTimeFormat().resolvedOptions().timeZone?.includes("Kolkata") ? "INR" : "USD";
      const res = await api.post<{
        gateway: "stripe" | "razorpay";
        url?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        key?: string;
      }>("/subscription/checkout", {
        plan: selectedPlan,
        period: annual ? "yearly" : "monthly",
        currency,
      }, token);

      if (res.gateway === "stripe" && res.url) {
        window.location.href = res.url;
      } else if (res.gateway === "razorpay" && res.orderId && res.amount && res.currency && res.key) {
        handleRazorpayPayment({ orderId: res.orderId, amount: res.amount, currency: res.currency, key: res.key }, selectedPlan, token);
      }
    } catch (err) {
      setToast({ type: "error", message: (err as Error).message || "Failed to start checkout" });
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpayPayment = async (
    orderData: { orderId: string; amount: number; currency: string; key: string },
    plan: string,
    token: string
  ) => {
    return new Promise<void>((resolve) => {
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "CareDesk",
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Subscription`,
        order_id: orderData.orderId,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            await api.post("/subscription/razorpay/verify", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }, token);
            setToast({ type: "success", message: "Payment successful! Your plan has been upgraded." });
          } catch {
            setToast({ type: "error", message: "Payment verified but activation failed. Contact support." });
          }
          resolve();
        },
        modal: {
          ondismiss: () => { setToast({ type: "error", message: "Payment cancelled." }); resolve(); },
        },
      };

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      };
      script.onerror = () => {
        setToast({ type: "error", message: "Failed to load payment gateway." });
        resolve();
      };
      document.body.appendChild(script);
    });
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription?")) return;
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      await api.post("/subscription/cancel", {}, token);
      setToast({ type: "success", message: "Subscription cancelled. Access continues until period ends." });
    } catch (err) {
      setToast({ type: "error", message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const res = await api.post<{ url: string }>("/subscription/portal", {}, token);
      window.location.href = res.url;
    } catch (err) {
      setToast({ type: "error", message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const planFeatures: Record<string, string[]> = {
    basic: ["2 family members", "10 report uploads", "AI analysis + trends", "Doctor visit coach"],
    premium: ["4 family members", "Unlimited reports", "Full trend graphs", "Abnormality alerts", "Priority support"],
    family: ["6 family members", "Everything in Premium", "Family coordination", "Shared care timeline", "Dedicated support"],
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account and subscription</p>
      </div>

      {toast && (
        <div className={`flex items-center gap-3 p-4 rounded-xl ${toast.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {toast.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Profile */}
      <div className="bg-white rounded-xl border border-white/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-navy" />
          <h2 className="text-base font-semibold text-navy">Profile</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Name</label>
            <p className="text-sm text-navy">{user?.firstName} {user?.lastName}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Email</label>
            <p className="text-sm text-navy">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-xl border border-white/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5 text-navy" />
          <h2 className="text-base font-semibold text-navy">Subscription</h2>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            isPremium ? "bg-blue-pale text-blue" : "bg-slate-100 text-slate-600"
          }`}>
            {currentPlan} Plan
          </span>
          {isPremium && (
            <button onClick={handlePortal} disabled={loading} className="text-xs font-semibold text-blue hover:text-navy">
              Manage billing
            </button>
          )}
        </div>
        {isPremium && (
          <button onClick={handleCancel} disabled={loading} className="text-xs font-semibold text-red-500 hover:text-red-600">
            {loading ? "Processing..." : "Cancel subscription"}
          </button>
        )}
      </div>

      {/* Upgrade Plans */}
      {!isPremium && (
        <div className="bg-white rounded-xl border border-white/20 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-blue" />
            <h2 className="text-base font-semibold text-navy">Upgrade your plan</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">Unlock more features for you and your family</p>

          <div className="inline-flex items-center gap-2 bg-slate-100 rounded-full p-1 mb-6">
            <button
              onClick={() => setAnnual(false)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${!annual ? "bg-navy text-white shadow-sm" : "text-slate-500 hover:text-navy"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${annual ? "bg-navy text-white shadow-sm" : "text-slate-500 hover:text-navy"}`}
            >
              Yearly <span className="text-[10px] text-green-500 ml-0.5">Save 30%+</span>
            </button>
          </div>

          <div className="space-y-4">
            {/* Basic */}
            <div className="border border-slate-200 rounded-xl p-5 hover:border-blue transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-navy">Basic</h3>
                  <p className="text-xs text-slate-500">For individuals getting started</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-navy">{annual ? formatUSD(USD_PLANS.basic.annual) : formatUSD(USD_PLANS.basic.monthly)}</p>
                  <p className="text-[10px] text-slate-400">{annual ? "/year" : "/month"}</p>
                </div>
              </div>
              <ul className="space-y-1 mb-4">
                {planFeatures.basic.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between">
                {!annual && <p className="text-[10px] text-slate-400">{formatUSD(USD_PLANS.basic.annual)}/year — save 28%</p>}
                {annual && <p className="text-[10px] text-slate-400">Billed annually</p>}
                <button
                  onClick={() => handleCheckout("basic")}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-navy border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Choose Basic
                </button>
              </div>
            </div>

            {/* Premium */}
            <div className="border-2 border-navy rounded-xl p-5 relative">
              <span className="absolute -top-3 left-4 px-2 py-0.5 bg-navy text-white text-[10px] font-bold rounded-full">Popular</span>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-navy">Premium</h3>
                  <p className="text-xs text-slate-500">For serious health tracking</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-navy">{annual ? formatUSD(USD_PLANS.premium.annual) : formatUSD(USD_PLANS.premium.monthly)}</p>
                  <p className="text-[10px] text-slate-400">{annual ? "/year" : "/month"}</p>
                </div>
              </div>
              <ul className="space-y-1 mb-4">
                {planFeatures.premium.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between">
                {!annual && <p className="text-[10px] text-slate-400">{formatUSD(USD_PLANS.premium.annual)}/year — save 33%</p>}
                {annual && <p className="text-[10px] text-slate-400">Billed annually</p>}
                <button
                  onClick={() => handleCheckout("premium")}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-navy text-white rounded-lg hover:bg-navy-light transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Go Premium"}
                </button>
              </div>
            </div>

            {/* Family */}
            <div className="border border-slate-200 rounded-xl p-5 hover:border-blue transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-navy">Family</h3>
                  <p className="text-xs text-slate-500">For families managing health together</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-navy">{annual ? formatUSD(USD_PLANS.family.annual) : formatUSD(USD_PLANS.family.monthly)}</p>
                  <p className="text-[10px] text-slate-400">{annual ? "/year" : "/month"}</p>
                </div>
              </div>
              <ul className="space-y-1 mb-4">
                {planFeatures.family.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between">
                {!annual && <p className="text-[10px] text-slate-400">{formatUSD(USD_PLANS.family.annual)}/year — save 30%</p>}
                {annual && <p className="text-[10px] text-slate-400">Billed annually</p>}
                <button
                  onClick={() => handleCheckout("family")}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-navy border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Choose Family
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security */}
      <div className="bg-white rounded-xl border border-white/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-navy" />
          <h2 className="text-base font-semibold text-navy">Security</h2>
        </div>
        <p className="text-sm text-slate-500">
          Account security is managed through Clerk. Use the button below to manage your password and MFA settings.
        </p>
        <button
          onClick={() => {
            if (typeof window !== "undefined") window.open("https://dashboard.clerk.com", "_blank");
          }}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-sm font-semibold text-navy rounded-lg hover:bg-slate-200 transition-colors"
        >
          Manage account
        </button>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-white/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-navy" />
          <h2 className="text-base font-semibold text-navy">Notifications</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-navy">Email alerts</p>
              <p className="text-xs text-slate-500">Receive alerts for abnormal values</p>
            </div>
            <div className="w-10 h-6 bg-blue rounded-full relative cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-navy">Medication reminders</p>
              <p className="text-xs text-slate-500">Daily medication reminders</p>
            </div>
            <div className="w-10 h-6 bg-blue rounded-full relative cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
