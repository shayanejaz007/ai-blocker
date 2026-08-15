"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function PaymentVerifier() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isReturningFromCheckout = searchParams.get("payment") === "success";
  // Seed the initial state from the URL rather than setting it inside the effect
  const [status, setStatus] = useState<"idle" | "verifying" | "done" | "error">(
    isReturningFromCheckout ? "verifying" : "idle"
  );
  const [credited, setCredited] = useState(0);

  useEffect(() => {
    if (!isReturningFromCheckout) return;

    let cancelled = false;

    fetch("/api/stripe/verify", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setCredited(data.credited || 0);
        setStatus("done");
        // Refresh page data after a short delay to show updated balance
        if (data.credited > 0) {
          setTimeout(() => router.refresh(), 1500);
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [isReturningFromCheckout, router]);

  if (status === "idle") return null;

  if (status === "verifying") {
    return (
      <div className="mb-6 rounded-xl border p-4 flex items-center gap-3" style={{ background: "rgba(124,58,237,0.1)", borderColor: "rgba(124,58,237,0.3)" }}>
        <div className="animate-spin text-xl">⚙️</div>
        <span className="text-sm font-medium text-[var(--accent-light)]">Verifying your payment with Stripe...</span>
      </div>
    );
  }

  if (status === "done" && credited > 0) {
    return (
      <div className="mb-6 rounded-xl border p-4 flex items-center gap-3" style={{ background: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.3)" }}>
        <span className="text-xl">✅</span>
        <span className="text-sm font-medium text-green-400">
          Payment successful! <strong>{credited} credits</strong> have been added to your account.
        </span>
      </div>
    );
  }

  if (status === "done" && credited === 0) {
    return (
      <div className="mb-6 rounded-xl border p-4 flex items-center gap-3" style={{ background: "rgba(124,58,237,0.1)", borderColor: "rgba(124,58,237,0.3)" }}>
        <span className="text-xl">💎</span>
        <span className="text-sm font-medium text-[var(--accent-light)]">
          Payment confirmed! Your credits are already in your account.
        </span>
      </div>
    );
  }

  return null;
}
