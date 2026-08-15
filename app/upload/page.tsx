"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { isDemoMode } from "@/lib/demo-data";
import Navbar from "@/components/ui/navbar";
import PageTransition from "@/components/ui/page-transition";
import AnimatedCounter from "@/components/ui/animated-counter";

interface PredictResult {
  type: string;
  prediction: string;
  confidence: number;
  fake_probability: number;
  real_probability: number;
  frames_analyzed?: number;
  creditsUsed: number;
  creditsRemaining: number;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PredictResult | null>(null);
  const [credits, setCredits] = useState<number | null>(() => (isDemoMode() ? 47 : null));
  const [dragOver, setDragOver] = useState(false);
  const [modelWarmingUp, setModelWarmingUp] = useState(false);
  const [modelStage, setModelStage] = useState("");
  const [modelProgress, setModelProgress] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<File | null>(null);
  const demo = isDemoMode();

  const STAGE_LABELS: Record<string, { label: string; progress: number }> = {
    idle:               { label: "Initializing...",          progress: 5  },
    init:               { label: "Starting up...",           progress: 10 },
    blob_download:      { label: "Downloading AI model...",  progress: 30 },
    config_download:    { label: "Loading configuration...", progress: 55 },
    model_load:         { label: "Loading model weights...", progress: 75 },
    processor_download: { label: "Loading image processor...",progress: 90 },
    done:               { label: "Ready! Running detection...",progress: 100},
    unreachable:        { label: "Connecting to server...",  progress: 5  },
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), []);

  useEffect(() => {
    if (demo) return; // demo balance is seeded in initial state
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("credit_balances")
          .select("balance")
          .eq("user_id", user.id)
          .single();
        setCredits(data?.balance ?? 0);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError("");
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else if (f.type.startsWith("video/")) {
      setPreview(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const runDetection = async (f: File) => {
    try {
      const formData = new FormData();
      formData.append("file", f);
      const res = await fetch("/api/predict", { method: "POST", body: formData });
      const data = await res.json();

      if (res.status === 503 || data.error === "model_loading") {
        // Model still loading — start warm-up polling
        setModelWarmingUp(true);
        setLoading(false);
        startModelPolling(f);
        return;
      }

      setModelWarmingUp(false);
      stopPolling();

      if (!res.ok) {
        if (data.error === "insufficient_credits") {
          setError(`Not enough credits. You need ${data.creditsNeeded} but have ${data.currentBalance}. Please buy more credits.`);
        } else {
          setError(data.error || data.details || "Analysis failed. Please try again.");
        }
      } else {
        setResult(data);
        setCredits(data.creditsRemaining);
      }
    } catch {
      setModelWarmingUp(false);
      stopPolling();
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const startModelPolling = (f: File) => {
    fileRef.current = f;
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/model-status");
        const data = await res.json();
        const stage = data.current_stage || "idle";
        const info = STAGE_LABELS[stage] || { label: "Loading model...", progress: 20 };
        setModelStage(info.label);
        setModelProgress(info.progress);

        if (data.model_loaded) {
          stopPolling();
          setModelStage("Ready! Running detection...");
          setModelProgress(100);
          setTimeout(() => {
            setModelWarmingUp(false);
            setLoading(true);
            runDetection(fileRef.current!);
          }, 600);
        }
      } catch { /* keep polling */ }
    }, 4000);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    if (demo) {
      await new Promise((r) => setTimeout(r, 2000));
      const isFake = file.name.toLowerCase().includes("fake") || Math.random() > 0.45;
      const conf = 0.75 + Math.random() * 0.22;
      setResult({
        type: file.type.startsWith("video/") ? "video" : "image",
        prediction: isFake ? "Fake" : "Real",
        confidence: parseFloat(conf.toFixed(4)),
        fake_probability: isFake ? parseFloat(conf.toFixed(4)) : parseFloat((1 - conf).toFixed(4)),
        real_probability: isFake ? parseFloat((1 - conf).toFixed(4)) : parseFloat(conf.toFixed(4)),
        frames_analyzed: file.type.startsWith("video/") ? 18 : undefined,
        creditsUsed: file.type.startsWith("video/") ? 3 : 1,
        creditsRemaining: (credits ?? 47) - (file.type.startsWith("video/") ? 3 : 1),
      });
      setCredits((prev) => (prev ?? 47) - (file.type.startsWith("video/") ? 3 : 1));
      setLoading(false);
      return;
    }

    await runDetection(file);
  };

  const isVideo = file?.type.startsWith("video/");
  const creditCost = isVideo ? 3 : 1;

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
            🎯 Demo Mode — Upload any image to see a simulated detection result.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar — credits now live here instead of a fixed badge that
          used to overlap the page heading on phones */}
      <Navbar
        showBack
        backHref="/dashboard"
        backLabel="Dashboard"
        maxWidth="1000px"
        showLogout={false}
        right={
          credits !== null ? (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[13px] sm:text-sm font-medium px-3 py-1.5 rounded-full border glass whitespace-nowrap tabular"
              style={{ borderColor: "rgba(124,58,237,0.3)", color: "var(--accent-light)" }}
            >
              💎 {credits}
              <span className="hidden sm:inline"> credits</span>
            </motion.span>
          ) : null
        }
      />

      <div className="max-w-[1000px] mx-auto gutter py-8 sm:py-10 pb-safe">
        <PageTransition>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Upload &amp; analyze</h1>
            <p className="text-sm mb-6 sm:mb-8" style={{ color: "var(--text-secondary)" }}>
              Add an image or video and we&apos;ll tell you whether it was AI-generated.
            </p>
          </motion.div>

          {/* Upload zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input")?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                document.getElementById("file-input")?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Choose a file to analyze"
            className="rounded-2xl border-2 border-dashed p-6 sm:p-12 text-center cursor-pointer transition-all mb-6 relative overflow-hidden"
            style={{
              borderColor: dragOver ? "var(--accent)" : "var(--border)",
              background: dragOver ? "rgba(124,58,237,0.08)" : "rgba(17,17,40,0.4)",
              boxShadow: dragOver ? "0 0 40px rgba(124,58,237,0.2), inset 0 0 40px rgba(124,58,237,0.05)" : "none",
            }}
            whileHover={{
              borderColor: "rgba(124,58,237,0.5)",
              boxShadow: "0 0 30px rgba(124,58,237,0.15)",
            }}
          >
            {/* Shimmer overlay */}
            <div className="absolute inset-0 shimmer pointer-events-none" />

            <input
              id="file-input"
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  {preview && (
                    // next/image can't optimize a client-side FileReader data
                    // URL, and there's nothing to optimize — it never leaves
                    // the browser. Plain <img> is correct here.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-h-48 sm:max-h-64 w-auto mx-auto rounded-xl mb-4 border object-contain"
                      style={{ borderColor: "var(--border)" }}
                    />
                  )}
                  {isVideo && !preview && (
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-5xl mb-4"
                    >
                      🎬
                    </motion.div>
                  )}
                  <p className="font-semibold mb-1 relative z-10 break-all px-2">{file.name}</p>
                  <p className="text-sm relative z-10" style={{ color: "var(--text-secondary)" }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB · tap to change
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="text-5xl mb-4"
                  >
                    📁
                  </motion.div>
                  {/* Drag-and-drop copy is meaningless on a phone — swap it out */}
                  <p className="font-semibold mb-1 relative z-10">
                    <span className="sm:hidden">Tap to choose a file</span>
                    <span className="hidden sm:inline">Drop your file here, or click to browse</span>
                  </p>
                  <p className="text-sm relative z-10" style={{ color: "var(--text-secondary)" }}>
                    JPG, PNG, WebP, MP4 and more · up to 50 MB
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Analyze button */}
          <AnimatePresence>
            {file && !result && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-8"
              >
                <motion.button
                  onClick={handleAnalyze}
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full sm:w-auto bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white px-8 py-3.5 rounded-lg text-sm font-semibold hover:shadow-[0_0_24px_var(--accent-glow)] transition-all cursor-pointer disabled:opacity-50 border-none overflow-hidden flex-shrink-0"
                >
                  <span className="absolute inset-0 shimmer" />
                  <span className="relative z-10">🔍 Analyze</span>
                </motion.button>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  This will use <strong className="text-white">{creditCost} credit{creditCost > 1 ? "s" : ""}</strong>.
                  {credits !== null && ` You have ${credits} credits remaining.`}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-8"
              >
                <p className="text-sm font-medium" role="alert">{error}</p>
                {error.includes("credits") && (
                  <Link href="/pricing" className="text-[var(--accent-light)] text-sm font-semibold no-underline hover:underline mt-2 inline-block">
                    Buy more credits →
                  </Link>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Model warming up */}
          <AnimatePresence>
            {modelWarmingUp && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass rounded-2xl p-6 sm:p-10 text-center mb-8"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="text-4xl mb-4 inline-block"
                >
                  🧠
                </motion.div>
                <p className="font-semibold text-lg mb-1" role="status" aria-live="polite">Model is warming up</p>
                <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
                  {modelStage || "Starting model server..."}
                </p>
                {/* Stage progress bar */}
                <div className="max-w-sm mx-auto">
                  <div className="flex justify-between text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                    <span>Loading</span>
                    <span className="tabular">{modelProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(124,58,237,0.15)" }}>
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7]"
                      animate={{ width: `${modelProgress}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                  <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>
                    ⏱ This only happens on cold start — usually takes ~90 seconds. Detection will run automatically once ready.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading / Analyzing */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass rounded-2xl p-8 sm:p-12 text-center mb-8"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="text-4xl mb-4 inline-block"
                >
                  ⚙️
                </motion.div>
                <p className="font-semibold" role="status" aria-live="polite">Analyzing your content…</p>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  {demo ? "Running simulated detection..." : "Our AI models are processing your file"}
                </p>
                <div className="mt-4 h-1.5 rounded-full overflow-hidden max-w-xs mx-auto" style={{ background: "rgba(124,58,237,0.15)" }}>
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7]"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
                className="glass rounded-2xl p-5 sm:p-8 mb-8"
              >
                {/* Prediction badge */}
                <div className="text-center mb-6 sm:mb-8">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 15 }}
                    role="status"
                    className={`inline-flex items-center gap-2 sm:gap-3 px-5 sm:px-8 py-3 sm:py-4 rounded-2xl text-base sm:text-2xl font-bold text-center ${
                      result.prediction === "Fake"
                        ? "bg-red-500/15 text-red-400 border-2 border-red-500/30 glow-red"
                        : "bg-green-500/15 text-green-400 border-2 border-green-500/30 glow-green"
                    }`}
                  >
                    {result.prediction === "Fake" ? "🚨 AI generated" : "✅ Authentic"}
                  </motion.div>
                </div>

                {/* Confidence */}
                <div className="text-center mb-8">
                  <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Confidence</p>
                  <AnimatedCounter
                    value={result.confidence * 100}
                    decimals={1}
                    suffix="%"
                    className="text-4xl sm:text-5xl font-bold tabular"
                    duration={1.2}
                  />
                </div>

                {/* Probability bars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span style={{ color: "var(--text-secondary)" }}>Fake Probability</span>
                      <span className="font-mono text-red-400 tabular">{(result.fake_probability * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(239,68,68,0.15)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.fake_probability * 100}%` }}
                        transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span style={{ color: "var(--text-secondary)" }}>Real Probability</span>
                      <span className="font-mono text-green-400 tabular">{(result.real_probability * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(34,197,94,0.15)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.real_probability * 100}%` }}
                        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-green-600 to-green-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Meta info */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="flex flex-wrap gap-2 sm:gap-3 pt-4 border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: "rgba(124,58,237,0.1)", color: "var(--accent-light)" }}>
                    Type: {result.type}
                  </span>
                  {result.frames_analyzed && (
                    <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: "rgba(124,58,237,0.1)", color: "var(--accent-light)" }}>
                      Frames: {result.frames_analyzed}
                    </span>
                  )}
                  <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: "rgba(124,58,237,0.1)", color: "var(--accent-light)" }}>
                    Credits used: {result.creditsUsed}
                  </span>
                </motion.div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setFile(null); setPreview(null); setResult(null); }}
                    className="w-full sm:w-auto bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white px-6 py-3 rounded-lg text-sm font-semibold hover:shadow-[0_0_20px_var(--accent-glow)] transition-all cursor-pointer border-none"
                  >
                    Analyze another
                  </motion.button>
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto text-center px-6 py-3 rounded-lg text-sm font-semibold border no-underline text-white hover:bg-[rgba(124,58,237,0.15)] transition-all"
                    style={{ borderColor: "rgba(124,58,237,0.45)" }}
                  >
                    Back to dashboard
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PageTransition>
      </div>
    </div>
  );
}
