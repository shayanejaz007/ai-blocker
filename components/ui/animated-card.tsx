"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  glowColor?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
  ariaLabel?: string;
}

export default function AnimatedCard({
  children,
  className = "",
  delay = 0,
  glowColor = "rgba(124,58,237,0.3)",
  style,
  onClick,
  role,
  tabIndex,
  ariaLabel,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{
        scale: 1.02,
        boxShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor.replace(/[\d.]+\)$/, "0.1)")}`,
        borderColor: glowColor.replace(/[\d.]+\)$/, "0.6)"),
      }}
      whileTap={onClick ? { scale: 0.97 } : {}}
      className={`glass rounded-xl transition-colors ${className}`}
      style={style}
      onClick={onClick}
      role={role}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}
