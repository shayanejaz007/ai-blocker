"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GradientBorderProps {
  children: ReactNode;
  className?: string;
  borderWidth?: number;
  borderRadius?: number;
}

export default function GradientBorder({
  children,
  className = "",
  borderWidth = 1.5,
  borderRadius = 16,
}: GradientBorderProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Animated gradient border */}
      <motion.div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          borderRadius,
          padding: borderWidth,
          background: "conic-gradient(from var(--border-angle, 0deg), #7c3aed, #a855f7, #7c3aed)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
        animate={{
          "--border-angle": ["0deg", "360deg"],
        } as Record<string, string[]>}
        transition={{
          "--border-angle": {
            duration: 4,
            repeat: Infinity,
            ease: "linear",
          },
        } as Record<string, unknown>}
      />
      {/* Inner content */}
      <div
        className="relative"
        style={{
          borderRadius,
          background: "var(--bg-card)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
