"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Logo from "@/components/ui/logo";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/auth/login?message=Account+created!+You+can+now+sign+in.");
    }
  };


  return (
    <div className="min-h-screen-safe flex items-center justify-center gutter py-10 relative overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Background glow orbs */}
      <div className="absolute top-1/3 right-1/4 w-[min(24rem,80vw)] aspect-square rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: "#7c3aed" }} />
      <div className="absolute bottom-1/3 left-1/4 w-[min(16rem,60vw)] aspect-square rounded-full blur-[100px] opacity-10 pointer-events-none" style={{ background: "#a855f7" }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <Logo size={40} animated className="justify-center w-full mb-8" wordmarkClass="text-2xl" />

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass rounded-2xl p-6 sm:p-8"
        >
          <AnimatePresence mode="wait">
            <motion.div key="form">
                <h1 className="text-2xl font-bold text-center mb-2">Create your account</h1>
                <p className="text-sm text-center mb-8" style={{ color: "var(--text-secondary)" }}>
                  Your first scan is free — no card required.
                </p>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-6 overflow-hidden"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="w-full px-4 py-3 rounded-lg border text-base text-white outline-none transition-all focus:border-[var(--accent)] focus:shadow-[0_0_12px_rgba(124,58,237,0.2)]"
                      style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="password" className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="text-xs font-medium bg-transparent border-none cursor-pointer hover:text-white transition-colors"
                        style={{ color: "var(--accent-light)" }}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="w-full px-4 py-3 rounded-lg border text-base text-white outline-none transition-all focus:border-[var(--accent)] focus:shadow-[0_0_12px_rgba(124,58,237,0.2)]"
                      style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      Confirm password
                    </label>
                    <input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="w-full px-4 py-3 rounded-lg border text-base text-white outline-none transition-all focus:border-[var(--accent)] focus:shadow-[0_0_12px_rgba(124,58,237,0.2)]"
                      style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
                      placeholder="••••••••"
                    />
                  </div>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full py-3.5 rounded-lg text-[15px] font-semibold text-white bg-gradient-to-br from-[#7c3aed] to-[#a855f7] hover:shadow-[0_0_24px_var(--accent-glow)] hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 border-none relative overflow-hidden"
                  >
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.span
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-center gap-2"
                        >
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="inline-block"
                          >
                            ⚙️
                          </motion.span>
                          Creating account...
                        </motion.span>
                      ) : (
                        <motion.span
                          key="idle"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          Create Account
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </form>

                <p className="text-sm text-center mt-6" style={{ color: "var(--text-secondary)" }}>
                  Already have an account?{" "}
                  <Link href="/auth/login" className="text-[var(--accent-light)] no-underline font-medium hover:underline">
                    Sign in
                  </Link>
                </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
