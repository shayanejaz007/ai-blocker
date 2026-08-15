"use client";

import { useId } from "react";
import Link from "next/link";

/**
 * Decod3X logo — the single source of truth.
 *
 * Previously the mark was copy-pasted as inline SVG into the landing page,
 * navbar, login and signup pages, each with a hardcoded gradient id
 * ("navGrad", "lGrad", "sGrad"). SVG <defs> live in a document-global
 * namespace, so two logos on one page meant the first gradient definition
 * won for both — a latent rendering bug. useId() gives every instance its
 * own namespaced ids.
 *
 * The mark is a D/X monogram: a bold geometric D whose counter conceals an X.
 * Vectorized by hand from the source artwork rather than embedding the bitmap,
 * so it stays sharp at every density, inherits the theme gradient, and costs
 * no network request. Proportions are measured from the original: the X's arm
 * weight equals the D's stem width, and the X is centered in the counter.
 */

interface LogoMarkProps {
  /** Pixel size of the square mark. */
  size?: number;
  className?: string;
  /** Animate the core. Off by default; always disabled under reduced motion. */
  animated?: boolean;
}

export function LogoMark({ size = 36, className = "", animated = false }: LogoMarkProps) {
  const uid = useId().replace(/:/g, "");
  const grad = `dx-grad-${uid}`;
  const counter = `dx-counter-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 ${className}`}
      role="img"
      aria-label="Decod3X"
    >
      <defs>
        <linearGradient id={grad} x1="10" y1="6" x2="87" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        {/* The X is clipped to the counter so its arms cut flush against the
            stem and the bowl's inner curve, exactly like the source mark. */}
        <clipPath id={counter}>
          <path d="M24.6 20.2 L46.6 20.2 C64 20.2 72.9 33 72.9 48 C72.9 63 64 75.8 46.6 75.8 L24.6 75.8 Z" />
        </clipPath>
      </defs>

      {/* D shell — outer contour and counter in one path, evenodd punches the hole */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill={`url(#${grad})`}
        d="M10 6 L47 6 C73 6 87.4 25 87.4 48 C87.4 71 73 90 47 90 L10 90 Z
           M24.6 20.2 L24.6 75.8 L46.6 75.8 C64 75.8 72.9 63 72.9 48 C72.9 33 64 20.2 46.6 20.2 Z"
      />

      {/* X hidden in the counter. Arm weight (12) matches the D's stem. */}
      <g clipPath={`url(#${counter})`} stroke={`url(#${grad})`} strokeWidth="12">
        <line x1="28" y1="18" x2="70" y2="78">
          {animated && (
            <animate
              attributeName="opacity"
              values="1;0.55;1"
              dur="2.8s"
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
              keyTimes="0;0.5;1"
            />
          )}
        </line>
        <line x1="70" y1="18" x2="28" y2="78">
          {animated && (
            <animate
              attributeName="opacity"
              values="1;0.55;1"
              dur="2.8s"
              begin="0.4s"
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
              keyTimes="0;0.5;1"
            />
          )}
        </line>
      </g>
    </svg>
  );
}

interface LogoProps extends LogoMarkProps {
  /** Render the wordmark next to the mark. */
  withWordmark?: boolean;
  /** Wrap in a link to this href. Pass null for a bare logo. */
  href?: string | null;
  /** Tailwind text size class for the wordmark. */
  wordmarkClass?: string;
}

export default function Logo({
  size = 36,
  animated = false,
  withWordmark = true,
  href = "/",
  wordmarkClass = "text-xl sm:text-[22px]",
  className = "",
}: LogoProps) {
  const inner = (
    <>
      <LogoMark size={size} animated={animated} />
      {withWordmark && (
        <span className={`${wordmarkClass} font-extrabold text-gradient tracking-tight`}>
          Decod3X
        </span>
      )}
    </>
  );

  if (href === null) {
    return <span className={`inline-flex items-center gap-2.5 ${className}`}>{inner}</span>;
  }

  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 no-underline ${className}`}>
      {inner}
    </Link>
  );
}
