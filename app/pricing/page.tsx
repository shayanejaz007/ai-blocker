"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/navbar";
import PageTransition from "@/components/ui/page-transition";
import GradientBorder from "@/components/ui/gradient-border";

// ── Monthly subscription plans ───────────────────────────────────────────────
const subscriptionPlans = [
  {
    name: "Starter",
    key: "starter",
    price: 9.89,
    credits: 25,
    perCredit: 0.40,
    badge: null,
    desc: "Great for casual use.",
    cta: "Start Monthly",
    features: [
      "25 credits / month",
      "AI image detection",
      "Basic reports",
      "Dashboard access",
      "Email support",
    ],
    featured: false,
  },
  {
    name: "Pro",
    key: "pro",
    price: 28.89,
    credits: 75,
    perCredit: 0.38,
    badge: "⭐ Most Popular",
    desc: "Best for regular users & teams.",
    cta: "Go Pro",
    features: [
      "75 credits / month",
      "Image & video detection",
      "Detailed analytics",
      "API access",
      "Priority support",
      "Team dashboard (5 seats)",
    ],
    featured: true,
  },
  {
    name: "Enterprise",
    key: "enterprise",
    price: 79.98,
    credits: 175,
    perCredit: 0.46,
    badge: "🏢 High Volume",
    desc: "For businesses at scale.",
    cta: "Get Enterprise",
    features: [
      "175 credits / month",
      "All Pro features",
      "Dedicated infrastructure",
      "Custom AI models",
      "SLA guarantee",
      "24/7 dedicated support",
      "Compliance exports",
    ],
    featured: false,
  },
];

// ── One-time credit packs (user psychology driven) ───────────────────────────
const onetimePlans = [
  {
    name: "Try It",
    key: "pack_s",
    price: 2.99,
    credits: 10,
    perCredit: 0.30,
    badge: null,
    desc: "Test the waters — no commitment.",
    cta: "Buy 10 Credits",
    features: [
      "10 detection credits",
      "Never expires",
      "Image & video detection",
      "Full dashboard access",
      "No subscription needed",
    ],
    featured: false,
  },
  {
    name: "Most Popular",
    key: "pack_m",
    price: 7.99,
    credits: 35,
    perCredit: 0.23,
    badge: "🔥 Best Deal",
    desc: "Save 25% per credit vs Try It.",
    cta: "Buy 35 Credits",
    features: [
      "35 detection credits",
      "Never expires",
      "Image & video detection",
      "Full dashboard access",
      "Save 25% per credit",
    ],
    featured: true,
  },
  {
    name: "Power Pack",
    key: "pack_l",
    price: 14.99,
    credits: 80,
    perCredit: 0.19,
    badge: "💎 Best Value",
    desc: "Save 37% — for power users.",
    cta: "Buy 80 Credits",
    features: [
      "80 detection credits",
      "Never expires",
      "Image & video detection",
      "Full dashboard access",
      "Save 37% per credit",
    ],
    featured: false,
  },
];

export default function PricingPage() {
  const [mode, setMode] = useState<"subscription" | "onetime">("subscription");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const plans = mode === "subscription" ? subscriptionPlans : onetimePlans;

  const handleBuy = async (planKey: string) => {
    setLoading(planKey);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { router.push("/auth/login"); return; }
        setError(data.error || "Something went wrong. Please try again.");
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(null);
    }
  };

  const PlanCard = ({ plan, index }: { plan: typeof plans[0]; index: number }) => {
    const inner = (
      <div className="p-6 sm:p-8 h-full flex flex-col relative">
        {plan.badge && (
          <motion.div
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap z-10"
          >
            {plan.badge}
          </motion.div>
        )}

        {/* Plan name */}
        <div className="text-[13px] font-bold tracking-[0.1em] uppercase text-[var(--accent-light)] mb-3">
          {plan.name}
        </div>

        {/* Price */}
        <div className="flex items-end gap-1 mb-1">
          <span className="text-lg font-semibold" style={{ color: "var(--text-secondary)" }}>$</span>
          <span className="text-4xl sm:text-5xl font-extrabold tracking-tight tabular">{plan.price.toFixed(2)}</span>
        </div>
        <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
          {mode === "subscription" ? "per month · billed monthly" : "one-time · never expires"}
        </p>

        {/* Credits + per-credit */}
        <div className="flex items-center gap-2 mt-3 mb-1">
          <span className="text-sm font-bold text-white">{plan.credits} credits</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.15)", color: "var(--accent-light)" }}>
            ${plan.perCredit.toFixed(2)}/credit
          </span>
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{plan.desc}</p>

        <div className="h-px mb-5" style={{ background: "var(--border)" }} />

        <ul className="list-none mb-8 space-y-2.5 flex-1">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm py-0.5" style={{ color: "var(--text-secondary)" }}>
              <span className="text-[var(--accent-light)] font-bold flex-shrink-0 mt-0.5">✓</span>
              {f}
            </li>
          ))}
        </ul>

        <motion.button
          onClick={() => handleBuy(plan.key)}
          disabled={loading === plan.key}
          aria-busy={loading === plan.key}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3.5 rounded-lg text-[15px] font-semibold cursor-pointer transition-all disabled:opacity-50 ${
            plan.featured
              ? "bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white border-none hover:shadow-[0_0_24px_var(--accent-glow)] hover:brightness-110"
              : "bg-transparent text-white border hover:bg-[rgba(124,58,237,0.15)] hover:border-[var(--accent-light)]"
          }`}
          style={!plan.featured ? { borderColor: "rgba(124,58,237,0.45)" } : {}}
        >
          {loading === plan.key ? "Opening checkout…" : plan.cta}
        </motion.button>
      </div>
    );

    if (plan.featured) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          whileHover={{ y: -6 }}
          className="relative mt-5 md:mt-0"
        >
          <GradientBorder borderRadius={16}>{inner}</GradientBorder>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ y: -6, boxShadow: "0 16px 40px rgba(124,58,237,0.15)" }}
        className="glass rounded-2xl relative"
      >
        {inner}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Navbar showBack backHref="/dashboard" maxWidth="1200px" showLogout={false} />

      <div className="max-w-[1200px] mx-auto gutter py-10 sm:py-16 pb-safe">
        <PageTransition>

          {/* Header */}
          <div className="text-center mb-10 sm:mb-12">
            <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-xs font-bold tracking-[0.15em] text-[var(--accent-light)] uppercase block mb-4">
              Pricing
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-[clamp(28px,6vw,48px)] font-bold leading-tight tracking-tight mb-4 text-balance">
              Choose How You Pay
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-base sm:text-lg max-w-[520px] mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Subscribe monthly for best value, or buy credits once — no commitment needed.
            </motion.p>
          </div>

          {/* Toggle */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex justify-center mb-10 sm:mb-12">
            <div className="flex p-1 rounded-xl border" style={{ background: "rgba(17,17,40,0.6)", borderColor: "rgba(124,58,237,0.25)" }}>
              <button
                onClick={() => setMode("subscription")}
                className={`relative px-5 sm:px-6 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none ${mode === "subscription" ? "text-white" : "text-gray-400 hover:text-white"}`}
              >
                {mode === "subscription" && (
                  <motion.div layoutId="pill" className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#a855f7]" style={{ zIndex: -1 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                )}
                📅 Monthly
              </button>
              <button
                onClick={() => setMode("onetime")}
                className={`relative px-5 sm:px-6 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none ${mode === "onetime" ? "text-white" : "text-gray-400 hover:text-white"}`}
              >
                {mode === "onetime" && (
                  <motion.div layoutId="pill" className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#a855f7]" style={{ zIndex: -1 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                )}
                ⚡ One-Time
              </button>
            </div>
          </motion.div>

          {/* Value note */}
          <AnimatePresence mode="wait">
            <motion.p
              key={mode}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="text-center text-sm mb-10"
              style={{ color: "var(--text-secondary)" }}
            >
              {mode === "subscription"
                ? "💡 Subscribe and save — credits refresh every month automatically."
                : "💡 Buy once, use anytime. Credits never expire."}
            </motion.p>
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="max-w-md mx-auto bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-8 text-center text-sm">
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Plan cards */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6"
            >
              {plans.map((plan, i) => (
                <PlanCard key={plan.key} plan={plan} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Bottom note */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center text-xs mt-10" style={{ color: "var(--text-secondary)" }}>
            All payments secured by Stripe · 1 image = 1 credit · 1 video = 3 credits ·{" "}
            <Link href="/auth/signup" className="text-[var(--accent-light)] no-underline hover:underline">
              Start free with 1 credit →
            </Link>
          </motion.p>

        </PageTransition>
      </div>
    </div>
  );
}
