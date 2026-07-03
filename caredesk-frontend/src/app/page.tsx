"use client";

import Link from "next/link";
import {
  Shield,
  Brain,
  Users,
  Activity,
  ArrowRight,
  Menu,
  X,
  Heart,
  FileText,
  TrendingUp,
  Stethoscope,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function AnimSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [annual, setAnnual] = useState(false);
  const { isSignedIn } = useAuth();
  const ctaHref = isSignedIn ? "/dashboard" : "/sign-up";

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navigation — Liquid Glass */}
      <nav className="fixed top-0 left-0 right-0 z-50 liquid-glass border-b-0 rounded-none" style={{ borderRadius: 0 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-navy rounded-xl flex items-center justify-center shadow-lg shadow-navy/20 animate-float">
                <Heart className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="currentColor" />
              </div>
              <span className="text-xl lg:text-2xl font-bold text-navy">
                care<span className="text-blue">desk</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              {["Features", "Pricing", "For Doctors"].map((item) => (
                <Link key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`} className="text-sm font-medium text-slate-600 hover:text-navy transition-all duration-300 ease-in-out hover-scale">
                  {item}
                </Link>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link href={isSignedIn ? "/dashboard" : "/sign-in"} className="text-sm font-medium text-slate-600 hover:text-navy transition-all duration-300 ease-in-out">
                Sign in
              </Link>
              <Link href={ctaHref} className="px-5 py-2.5 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy-light transition-all duration-300 ease-in-out shadow-lg shadow-navy/20 btn-press hover-scale">
                Get Started Free
              </Link>
            </div>

            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden liquid-glass border-t-0 animate-slide-down" style={{ borderRadius: 0 }}>
            <div className="px-4 py-4 space-y-3">
              {["Features", "Pricing", "For Doctors"].map((item) => (
                <Link key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`} className="block text-sm font-medium text-slate-600 py-2 transition-all duration-300 ease-in-out hover:text-navy">{item}</Link>
              ))}
              <hr className="border-slate-100" />
              <Link href={isSignedIn ? "/dashboard" : "/sign-in"} className="block text-sm font-medium text-slate-600 py-2 transition-all duration-300 ease-in-out hover:text-navy">Sign in</Link>
              <Link href={ctaHref} className="block w-full text-center px-5 py-2.5 bg-navy text-white text-sm font-semibold rounded-lg transition-all duration-300 ease-in-out hover:bg-navy-light">Get Started Free</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-24 lg:pt-32 pb-16 lg:pb-24 bg-gradient-to-b from-blue-bg to-white relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-navy/5 rounded-full blur-3xl" style={{ animation: "float 4s ease-in-out infinite 1s" }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <AnimSection>
                <div className="inline-flex items-center gap-2 px-4 py-2 liquid-glass rounded-full mb-6 border border-blue/20">
                  <Brain className="w-4 h-4 text-blue" />
                  <span className="text-xs font-semibold text-navy uppercase tracking-wide">AI-Powered Chronic Care Companion</span>
                </div>
              </AnimSection>

              <AnimSection delay={0.1}>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-navy leading-tight">
                  Your health.<br />Your team.<br />One <span className="gradient-text">intelligent</span> hub.
                </h1>
              </AnimSection>

              <AnimSection delay={0.2}>
                <p className="mt-6 text-lg text-slate-500 leading-relaxed max-w-lg">
                  CareDesk connects reports, doctor visits, and your care team into one AI-powered system that helps you understand your health and stay a step ahead.
                </p>
              </AnimSection>

              <AnimSection delay={0.3}>
                <div className="mt-8">
                  <Link href={ctaHref} className="px-8 py-3.5 bg-navy text-white font-semibold rounded-lg hover:bg-navy-light transition-all text-center shadow-xl shadow-navy/20 btn-press hover-scale inline-block">
                    Get Started Free
                  </Link>
                </div>
              </AnimSection>

              <AnimSection delay={0.4}>
                <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-500">
                  {[{ icon: Brain, text: "AI-Powered Insights" }, { icon: Shield, text: "Secure & Private" }, { icon: Users, text: "Trusted by Families" }].map((item) => (
                    <div key={item.text} className="flex items-center gap-2 hover-scale">
                      <item.icon className="w-4 h-4 text-blue" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </AnimSection>
            </div>

            {/* Hero Visual — Liquid Glass Card */}
            <AnimSection delay={0.3}>
              <div className="relative">
                <div className="liquid-glass-refract rounded-3xl p-8 relative overflow-hidden animate-float border border-white/30">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center shadow-lg shadow-navy/20">
                        <Heart className="w-5 h-5 text-white" fill="currentColor" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-navy">Your Health Dashboard</p>
                        <p className="text-xs text-slate-600">AI-powered insights at a glance</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50">
                        <div className="flex items-center gap-2 mb-3">
                          <Activity className="w-4 h-4 text-blue" />
                          <span className="text-xs font-semibold text-navy">Health Analytics</span>
                        </div>
                        <div className="h-20 flex items-end gap-1">
                          {[40, 55, 45, 65, 50, 70, 60, 55, 45, 60].map((h, i) => (
                            <div key={i} className="flex-1 bg-blue/20 rounded-t transition-all duration-500" style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}>
                              {i === 7 && <div className="bg-blue rounded-t w-full h-full animate-pulse-glow" />}
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs font-bold text-blue">Trending Up</span>
                          <TrendingUp className="w-3 h-3 text-green-500 animate-float" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 text-center border border-white/50 glass-hover-glow">
                          <p className="text-lg font-bold text-green-600">Normal</p>
                          <p className="text-[10px] text-slate-600">Last Report</p>
                        </div>
                        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 text-center border border-white/50 glass-hover-glow">
                          <p className="text-lg font-bold text-blue">3 Members</p>
                          <p className="text-[10px] text-slate-600">Family Care</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AnimSection>
          </div>
        </div>
      </section>

      {/* Trust Logos */}
      <section className="py-12 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-8">Built with industry-standard security</p>
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16 opacity-60">
            {["HIPAA Compliant", "256-bit Encryption", "SOC 2 Certified", "GDPR Ready", "Cloudflare R2", "Stripe Payments"].map((name) => (
              <span key={name} className="text-sm lg:text-base font-bold text-slate-600 hover-scale">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Three Pillars — Liquid Glass Cards */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimSection className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-navy">Three pillars. Complete care.</h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">Everything you need to manage chronic health, connected in one place.</p>
          </AnimSection>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: "01", title: "Medical History Timeline", desc: "Upload reports, get AI analysis, track trends, and detect abnormalities early.", icon: FileText, color: "bg-blue-pale text-blue", link: "Explore Timeline" },
              { num: "02", title: "Pre-Doctor Appointment Coach", desc: "Log symptoms, get smart questions, and capture doctor advice. Walk in prepared, walk out confident.", icon: Stethoscope, color: "bg-green-50 text-green-600", link: "Try Coach" },
              { num: "03", title: "Remote Caregiver Dashboard", desc: "Monitor your loved ones, get alerts, manage medications, and coordinate care remotely.", icon: Users, color: "bg-orange-50 text-orange-500", link: "View Dashboard" },
            ].map((pillar, i) => (
              <AnimSection key={pillar.num} delay={i * 0.15}>
                <div className="liquid-glass-refract rounded-3xl p-6 lg:p-8 hover-lift glass-hover-glow relative overflow-hidden group cursor-pointer border border-white/30">
                  <div className={`w-10 h-10 rounded-xl ${pillar.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <pillar.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-600">{pillar.num}</span>
                  <h3 className="text-xl font-bold text-navy mt-2 mb-3">{pillar.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">{pillar.desc}</p>
                  <Link href={ctaHref} className="text-sm font-semibold text-blue flex items-center gap-1 hover:gap-2 transition-all duration-300 ease-in-out">
                    {pillar.link} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner — Liquid Glass Dark */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimSection>
            <div className="rounded-3xl p-8 lg:p-16 text-center relative overflow-hidden liquid-glass-dark">
              <div className="absolute inset-0 bg-gradient-to-r from-navy/30 via-navy/20 to-navy/30 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">Ready to take control of your health journey?</h2>
                <p className="text-white/80 mb-8 max-w-lg mx-auto">Join thousands of families who trust CareDesk for smarter, connected care.</p>
                <Link href={ctaHref} className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-navy font-semibold rounded-lg hover:bg-blue-pale transition-all shadow-xl btn-press hover-scale">
                  Get Started Free
                </Link>
                <p className="text-xs text-white/50 mt-3">No credit card required</p>
              </div>
            </div>
          </AnimSection>
        </div>
      </section>

      {/* Built For Everyone — Liquid Glass Cards */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimSection className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-navy">Built for everyone in your care journey</h2>
            <p className="mt-4 text-lg text-slate-500">CareDesk adapts to your role and helps you focus on what matters.</p>
          </AnimSection>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "For Patients", desc: "Understand your health, track progress, and stay in control.", icon: Heart, color: "text-blue", bg: "bg-blue-pale" },
              { title: "For Caregivers", desc: "Care from anywhere. Stay informed and act with confidence.", icon: Users, color: "text-green-600", bg: "bg-green-50" },
              { title: "For Doctors", desc: "Save time, improve outcomes, and deliver better care.", icon: Stethoscope, color: "text-navy", bg: "bg-slate-100" },
            ].map((role, i) => (
              <AnimSection key={role.title} delay={i * 0.15}>
                <div className="text-center p-8 liquid-glass-refract rounded-3xl hover-lift glass-hover-glow relative overflow-hidden group cursor-pointer border border-white/30">
                  <div className={`w-16 h-16 ${role.bg} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                    <role.icon className={`w-8 h-8 ${role.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-navy mb-3">{role.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">{role.desc}</p>
                    <Link href={ctaHref} className="text-sm font-semibold text-blue flex items-center justify-center gap-1 hover:gap-2 transition-all duration-300 ease-in-out">
                    Learn more <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — Liquid Glass Cards */}
      <section id="pricing" className="py-20 lg:py-28 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-navy/5 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <AnimSection className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-navy">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-slate-500">Start free, upgrade when you need more. No hidden fees.</p>
            <div className="mt-6 inline-flex items-center gap-3 bg-white rounded-full p-1 border border-slate-200 shadow-sm">
              <button
                onClick={() => setAnnual(false)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ease-in-out ${!annual ? "bg-navy text-white shadow-md" : "text-slate-500 hover:text-navy"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ease-in-out ${annual ? "bg-navy text-white shadow-md" : "text-slate-500 hover:text-navy"}`}
              >
                Yearly
                <span className="ml-1.5 text-[10px] font-bold text-green-500">Save 30%+</span>
              </button>
            </div>
          </AnimSection>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { name: "Free", monthly: "$0", yearly: "$0", period: "forever", features: ["1 family member", "3 report uploads", "Basic AI summary", "Medication tracking"], cta: "Get Started", variant: "free" as const },
              { name: "Basic", monthly: "$4.99", yearly: "$39", period: "/month", yearPeriod: "/year", features: ["2 family members", "10 report uploads", "AI analysis + trends", "Doctor visit coach"], cta: "Start Basic", variant: "basic" as const },
              { name: "Premium", monthly: "$12.99", yearly: "$99", period: "/month", yearPeriod: "/year", features: ["4 family members", "Unlimited reports", "Full trend graphs", "Abnormality alerts", "Priority support"], cta: "Go Premium", variant: "premium" as const },
              { name: "Family", monthly: "$19.99", yearly: "$149", period: "/month", yearPeriod: "/year", features: ["6 family members", "Everything in Premium", "Family coordination", "Shared care timeline", "Dedicated support"], cta: "Go Family", variant: "family" as const },
            ].map((plan, i) => {
              const cardClass = {
                free: "bg-white border border-slate-200 hover-lift shadow-sm",
                basic: "bg-gradient-to-br from-blue-bg to-white border border-blue/20 hover-lift shadow-md",
                premium: "bg-gradient-to-br from-navy to-blue border border-navy/30 shadow-2xl shadow-navy/30 hover:scale-[1.02] transition-transform duration-300 ease-in-out",
                family: "bg-gradient-to-br from-blue to-navy border border-blue/30 shadow-2xl shadow-blue/20 hover-lift hover:scale-[1.02] transition-transform duration-300 ease-in-out",
              }[plan.variant];
              const textPrimary = plan.variant === "free" || plan.variant === "basic" ? "text-navy" : "text-white";
              const textSecondary = plan.variant === "free" || plan.variant === "basic" ? "text-slate-500" : "text-white/80";
              const textFeature = plan.variant === "free" || plan.variant === "basic" ? "text-slate-700" : "text-white/95";
              const checkColor = plan.variant === "premium" ? "text-green-300" : plan.variant === "family" ? "text-white" : "text-green-500";
              const badgeClass = plan.variant === "premium"
                ? "bg-white/20 text-white border-white/30"
                : plan.variant === "family"
                ? "bg-white/20 text-white border-white/30"
                : plan.variant === "basic"
                ? "bg-blue/15 text-blue border-blue/30"
                : "bg-slate-100 text-slate-600 border-slate-200";
              const ctaClass = plan.variant === "premium"
                ? "bg-white text-navy hover:bg-blue-pale shadow-lg shadow-white/10 hover-scale"
                : plan.variant === "family"
                ? "bg-white text-navy hover:bg-blue-pale shadow-lg shadow-white/10 hover-scale"
                : plan.variant === "basic"
                ? "bg-blue text-white hover:bg-blue/90 shadow-lg shadow-blue/20 hover-scale"
                : "bg-navy text-white hover:bg-navy-light shadow-lg shadow-navy/20 hover-scale";
              const badgeLabel = plan.variant === "premium" ? "Most Popular" : plan.variant === "family" ? "Best for Families" : plan.variant === "basic" ? "Best Value" : null;

              return (
              <AnimSection key={plan.name} delay={i * 0.1}>
                <div className={`rounded-3xl p-6 lg:p-8 transition-all duration-300 relative overflow-hidden ${cardClass}`}>
                  <div className="relative z-10">
                    {badgeLabel && (
                      <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border mb-3 ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                    )}
                    <h3 className={`text-lg font-bold ${textPrimary}`}>{plan.name}</h3>
                    <div className="mt-2 mb-6">
                      <span className={`text-3xl font-bold ${textPrimary}`}>{annual ? plan.yearly : plan.monthly}</span>
                      <span className={`text-sm ${textSecondary}`}>{annual && plan.yearPeriod ? plan.yearPeriod : plan.period}</span>
                    </div>
                    <ul className="space-y-2 mb-8">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <svg className={`w-4 h-4 shrink-0 ${checkColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className={textFeature}>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={ctaHref} className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all duration-300 ease-in-out btn-press ${ctaClass}`}>
                      {plan.cta}
                    </Link>
                  </div>
                </div>
              </AnimSection>
              );
            })}
          </div>

          <AnimSection delay={0.5}>
            <p className="text-center text-sm text-slate-500 mt-8">All plans include a 14-day free trial. No credit card required.</p>
          </AnimSection>
        </div>
      </section>

      {/* For Doctors — Liquid Glass Dark */}
      <section id="for-doctors" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimSection>
            <div className="rounded-3xl p-8 lg:p-16 text-white relative overflow-hidden liquid-glass-dark">
              <div className="absolute inset-0 bg-gradient-to-r from-navy/30 via-navy/20 to-navy/30 pointer-events-none" />
              <div className="relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div>
                    <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full mb-4 border border-white/20">For Doctors</span>
                    <h2 className="text-3xl lg:text-4xl font-bold mb-4">Recommend CareDesk to your patients</h2>
                    <p className="text-white/80 mb-8 leading-relaxed">Give your patients a tool that helps them track their health between visits. Better-prepared patients mean better conversations and outcomes.</p>
                    <ul className="space-y-3 mb-8">
                      {["Patients come prepared with AI-generated questions", "See patient health trends between visits", "Free Premium for 1 year when you refer 10+ patients", "No clinic integration required — patients upload manually"].map((f) => (
                        <li key={f} className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-green-300 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm text-white/90">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={ctaHref} className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-navy font-semibold rounded-lg hover:bg-blue-pale transition-all shadow-xl btn-press hover-scale">
                      Join as Doctor <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <div className="hidden lg:block">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl hover-lift">
                      <div className="flex items-center gap-3 mb-6">
                        <Stethoscope className="w-8 h-8 text-white" />
                        <div>
                          <p className="font-semibold text-white">Dr. Sharma</p>
                          <p className="text-sm text-white/70">Endocrinologist</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/15">
                          <p className="text-sm font-medium mb-1 text-white/80">Patients Referred</p>
                          <p className="text-2xl font-bold text-white animate-float">47</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/15">
                          <p className="text-sm font-medium mb-1 text-white/80">Active on CareDesk</p>
                          <p className="text-2xl font-bold text-white animate-float" style={{ animationDelay: "0.5s" }}>38</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 lg:py-16 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-navy rounded-xl flex items-center justify-center shadow-lg shadow-navy/20">
                  <Heart className="w-4 h-4 text-white" fill="currentColor" />
                </div>
                <span className="text-xl font-bold text-navy">care<span className="text-blue">desk</span></span>
              </div>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">AI-Powered Chronic Care Companion. Transform how you manage chronic health.</p>
            </div>

            {[
              { title: "Product", links: ["Features", "Pricing", "Analytics", "Reports"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Support", links: ["Help Center", "Privacy", "Terms", "Security"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-navy mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <Link href="#" className="text-sm text-slate-500 hover:text-navy transition-all duration-300 ease-in-out">{link}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">2026 CareDesk. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="#" className="text-xs text-slate-500 hover:text-navy transition-all duration-300 ease-in-out">Privacy</Link>
              <Link href="#" className="text-xs text-slate-500 hover:text-navy transition-all duration-300 ease-in-out">Terms</Link>
              <Link href="#" className="text-xs text-slate-500 hover:text-navy transition-all duration-300 ease-in-out">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
