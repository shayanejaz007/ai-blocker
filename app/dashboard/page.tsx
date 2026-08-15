import { redirect } from "next/navigation";
import { Suspense } from "react";
import PaymentVerifier from "./payment-verifier";
import DashboardClient from "./dashboard-client";
import { DEMO_USER, DEMO_BALANCE, DEMO_SCANS, isDemoMode } from "@/lib/demo-data";

async function getPageData() {
  if (isDemoMode()) {
    const scans = DEMO_SCANS;
    return {
      user: DEMO_USER,
      balance: DEMO_BALANCE,
      scans,
      totalScans: scans.length,
      fakeCount: scans.filter((s) => s.prediction === "Fake").length,
      realCount: scans.filter((s) => s.prediction === "Real").length,
    };
  }

  // Real mode — dynamic import to avoid errors when Supabase isn't configured
  const { createClient } = await import("@/utils/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: balanceData } = await supabase
    .from("credit_balances")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  const { count: totalScans } = await supabase
    .from("image_scans")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: fakeCount } = await supabase
    .from("image_scans")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("prediction", "Fake");

  const { count: realCount } = await supabase
    .from("image_scans")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("prediction", "Real");

  const { data: scans } = await supabase
    .from("image_scans")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    user,
    balance: balanceData?.balance ?? 0,
    scans: scans ?? [],
    totalScans: totalScans ?? 0,
    fakeCount: fakeCount ?? 0,
    realCount: realCount ?? 0,
  };
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, balance, scans, totalScans, fakeCount, realCount } = await getPageData();

  return (
    <>
      <Suspense fallback={null}>
        <PaymentVerifier />
      </Suspense>
      <DashboardClient
        user={user}
        balance={balance}
        scans={scans}
        totalScans={totalScans}
        fakeCount={fakeCount}
        realCount={realCount}
      />
    </>
  );
}
