"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={busy}
      className="px-3 sm:px-4 py-2 rounded-lg text-sm font-medium border hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
      style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "transparent" }}
    >
      {busy ? "Signing out…" : "Log out"}
    </button>
  );
}
