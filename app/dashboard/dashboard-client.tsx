"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import AnimatedCard from "@/components/ui/animated-card";
import AnimatedCounter from "@/components/ui/animated-counter";
import Navbar from "@/components/ui/navbar";
import PageTransition from "@/components/ui/page-transition";
import { useState } from "react";
import { isDemoMode } from "@/lib/demo-data";

type Filter = "all" | "Fake" | "Real";

interface Scan {
  id: string;
  filename: string;
  file_type: string;
  prediction: string;
  confidence: number;
  created_at: string;
}

interface DashboardClientProps {
  user: { email?: string; id?: string };
  balance: number;
  scans: Scan[];
  totalScans: number;
  fakeCount: number;
  realCount: number;
}

const statsConfig = [
  {
    label: "Credit Balance",
    icon: "💎",
    glowColor: "rgba(124,58,237,0.4)",
    glowClass: "glow-purple",
    iconBg: "rgba(124,58,237,0.15)",
  },
  {
    label: "Total Scans",
    icon: "📊",
    glowColor: "rgba(59,130,246,0.3)",
    glowClass: "glow-blue",
    iconBg: "rgba(59,130,246,0.15)",
  },
  {
    label: "Fake Detected",
    icon: "🚨",
    glowColor: "rgba(239,68,68,0.3)",
    glowClass: "glow-red",
    iconBg: "rgba(239,68,68,0.15)",
  },
  {
    label: "Real Detected",
    icon: "✅",
    glowColor: "rgba(34,197,94,0.3)",
    glowClass: "glow-green",
    iconBg: "rgba(34,197,94,0.15)",
  },
];

export default function DashboardClient({
  user,
  balance,
  scans,
  totalScans,
  fakeCount,
  realCount,
}: DashboardClientProps) {
  const demo = isDemoMode();
  const [filter, setFilter] = useState<Filter>("all");
  const statValues = [balance, totalScans, fakeCount, realCount];

  const filteredScans = filter === "all" ? scans : scans.filter((s) => s.prediction === filter);

  const handleStatClick = (index: number) => {
    if (index === 1) setFilter("all");
    if (index === 2) setFilter((f) => (f === "Fake" ? "all" : "Fake"));
    if (index === 3) setFilter((f) => (f === "Real" ? "all" : "Real"));
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Demo banner */}
      <AnimatePresence>
        {demo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white text-center py-2 text-sm font-medium overflow-hidden"
          >
            🎯 Demo Mode — Showing sample data. No real account needed.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <Navbar user={user} showLogout={!demo} />

      <div className="max-w-[1400px] mx-auto gutter py-8 sm:py-10 pb-safe">
        <PageTransition>
          {/* Hero greeting */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 sm:mb-10"
          >
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 truncate">
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-[#7c3aed] via-[#a855f7] to-[#7c3aed] bg-clip-text text-transparent animate-gradient-text bg-[length:200%_auto]">
                  {user.email?.split("@")[0] || "User"}
                </span>
              </h1>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Here&apos;s your detection overview.
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col xs:flex-row sm:flex-row gap-3 flex-shrink-0"
            >
              <Link
                href="/upload"
                className="relative bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white px-6 py-3 sm:py-2.5 rounded-lg text-sm font-semibold no-underline hover:shadow-[0_0_24px_var(--accent-glow)] sm:hover:scale-[1.03] transition-all inline-flex items-center justify-center gap-2 overflow-hidden"
              >
                <span className="absolute inset-0 shimmer" />
                <span className="relative z-10 flex items-center gap-2">🔍 Upload &amp; analyze</span>
              </Link>
              <Link
                href="/pricing"
                className="px-6 py-3 sm:py-2.5 rounded-lg text-sm font-semibold no-underline border hover:bg-[rgba(124,58,237,0.15)] hover:border-[var(--accent-light)] transition-all text-white inline-flex items-center justify-center gap-2"
                style={{ borderColor: "rgba(124,58,237,0.45)" }}
              >
                💳 Buy credits
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
            {statsConfig.map((stat, i) => {
              const isClickable = i === 1 || i === 2 || i === 3;
              const filterKey = i === 2 ? "Fake" : i === 3 ? "Real" : i === 1 ? "all" : null;
              const isActive = (i === 1 && filter === "all") || (filterKey !== null && filterKey !== "all" && filter === filterKey);
              return (
                <AnimatedCard
                  key={stat.label}
                  delay={i * 0.1}
                  glowColor={stat.glowColor}
                  className={`p-4 sm:p-6 ${stat.glowClass} transition-all ${
                    isClickable ? "cursor-pointer select-none" : ""
                  } ${isActive ? "ring-2 ring-offset-1 ring-offset-transparent" : ""}`}
                  style={isActive ? { outline: `2px solid ${stat.glowColor}` } : {}}
                  onClick={isClickable ? () => handleStatClick(i) : undefined}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  ariaLabel={isClickable ? `Filter scans by ${stat.label}` : undefined}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                    <div
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-base sm:text-xl flex-shrink-0"
                      style={{ background: stat.iconBg }}
                    >
                      {stat.icon}
                    </div>
                    <span className="text-xs sm:text-sm font-medium leading-tight" style={{ color: "var(--text-secondary)" }}>
                      {stat.label}
                    </span>
                    {isClickable && (
                      <span
                        className="ml-auto text-[10px] sm:text-xs px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline"
                        style={{ background: stat.iconBg, color: "var(--text-secondary)" }}
                      >
                        {isActive ? "✕" : "filter"}
                      </span>
                    )}
                  </div>
                  <AnimatedCounter
                    value={statValues[i]}
                    className="text-3xl sm:text-4xl font-bold tracking-tight tabular"
                  />
                </AnimatedCard>
              );
            })}
          </div>

          {/* Recent Scans */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="glass rounded-xl overflow-hidden"
          >
            <div
              className="px-4 sm:px-6 py-4 border-b flex items-center justify-between gap-3 flex-wrap"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold">Recent scans</h2>
                {filter !== "all" && (
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                      filter === "Fake"
                        ? "bg-red-500/15 text-red-400 border-red-500/30"
                        : "bg-green-500/15 text-green-400 border-green-500/30"
                    }`}
                  >
                    {filter === "Fake" ? "🚨 Fake only" : "✅ Real only"}
                  </span>
                )}
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                {filteredScans.length} result{filteredScans.length !== 1 ? "s" : ""}
              </span>
            </div>

            {!filteredScans || filteredScans.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className="p-10 sm:p-16 text-center"
              >
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-base font-semibold mb-1">No scans yet</p>
                <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                  Upload an image or video and it&apos;ll show up here.
                </p>
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white px-6 py-2.5 rounded-lg text-sm font-semibold no-underline hover:shadow-[0_0_20px_var(--accent-glow)] hover:scale-[1.02] transition-all"
                >
                  Upload your first image →
                </Link>
              </motion.div>
            ) : (
              <div className="p-2 sm:p-4 space-y-1 sm:space-y-3">
                {filteredScans.map((scan, i) => (
                  <motion.div
                    key={scan.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg hover:bg-white/[0.03] transition-colors"
                    style={{ borderBottom: "1px solid rgba(124,58,237,0.08)" }}
                  >
                    {/* File icon */}
                    <div
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-base sm:text-lg flex-shrink-0"
                      style={{ background: "rgba(124,58,237,0.1)" }}
                      aria-hidden="true"
                    >
                      {scan.file_type === "video" ? "🎬" : "🖼️"}
                    </div>

                    {/* Filename + meta. On mobile the confidence reading moves
                        here instead of disappearing with the desktop-only bar. */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{scan.filename}</p>
                      <p className="text-xs flex items-center gap-1.5 flex-wrap" style={{ color: "var(--text-secondary)" }}>
                        <span>
                          {new Date(scan.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="sm:hidden" aria-hidden="true">·</span>
                        <span className="sm:hidden tabular">
                          {(scan.confidence * 100).toFixed(1)}% confidence
                        </span>
                      </p>
                    </div>

                    {/* Confidence bar (desktop) */}
                    <div className="hidden sm:block w-32 flex-shrink-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: "var(--text-secondary)" }}>Confidence</span>
                        <span className="font-mono tabular">{(scan.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ background: "rgba(124,58,237,0.15)" }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${scan.confidence * 100}%` }}
                          transition={{ duration: 1, delay: 0.7 + i * 0.08 }}
                          className="h-full rounded-full"
                          style={{
                            background:
                              scan.prediction === "Fake"
                                ? "linear-gradient(90deg, #ef4444, #f87171)"
                                : "linear-gradient(90deg, #22c55e, #4ade80)",
                          }}
                        />
                      </div>
                    </div>

                    {/* Prediction badge — abbreviated on narrow screens so the
                        row never squeezes the filename to nothing */}
                    <span
                      className={`inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold flex-shrink-0 whitespace-nowrap ${
                        scan.prediction === "Fake"
                          ? "bg-red-500/15 text-red-400 border border-red-500/30 glow-red"
                          : "bg-green-500/15 text-green-400 border border-green-500/30 glow-green"
                      }`}
                    >
                      <span className="sm:hidden">{scan.prediction === "Fake" ? "AI" : "Real"}</span>
                      <span className="hidden sm:inline">
                        {scan.prediction === "Fake" ? "AI GENERATED" : "AUTHENTIC"}
                      </span>
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </PageTransition>
      </div>
    </div>
  );
}
