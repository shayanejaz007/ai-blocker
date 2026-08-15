"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import LogoutButton from "@/app/dashboard/logout-button";
import Logo from "@/components/ui/logo";

interface NavbarProps {
  user?: { email?: string } | null;
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
  maxWidth?: string;
  showLogout?: boolean;
  /** Optional slot rendered on the right (e.g. credits pill) */
  right?: React.ReactNode;
}


export default function Navbar({
  user,
  showBack = false,
  backHref = "/dashboard",
  backLabel = "Dashboard",
  maxWidth = "1400px",
  showLogout = true,
  right,
}: NavbarProps) {
  return (
    <motion.nav
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 border-b glass pt-safe"
      style={{
        background: "rgba(8,8,16,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: "var(--border)",
      }}
    >
      <div
        className="w-full mx-auto flex items-center justify-between gap-3 gutter"
        style={{ maxWidth, height: "var(--nav-h)" }}
      >
        {/* Left: back arrow (mobile) or logo */}
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <Link
              href={backHref}
              className="flex items-center gap-1.5 text-sm no-underline hover:text-white transition-colors -ml-2 px-2 py-2 rounded-lg"
              style={{ color: "var(--text-secondary)" }}
              aria-label={`Back to ${backLabel}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span className="hidden sm:inline">{backLabel}</span>
            </Link>
          )}
          <Logo size={32} wordmarkClass="text-lg" className="min-w-0 gap-2" />
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {right}
          {user?.email && (
            <span
              className="text-sm hidden md:inline max-w-[200px] truncate"
              style={{ color: "var(--text-secondary)" }}
              title={user.email}
            >
              {user.email}
            </span>
          )}
          {showLogout && <LogoutButton />}
        </div>
      </div>
    </motion.nav>
  );
}
