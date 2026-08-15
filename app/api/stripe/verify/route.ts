import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * POST /api/stripe/verify
 * Called when user returns from Stripe checkout.
 * Verifies the session with Stripe and adds credits if payment succeeded.
 * This is a backup to webhooks — handles cases where webhook can't reach the server
 * (e.g., localhost development, webhook misconfiguration).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: verify hits Stripe's API — 10 calls / min / user is plenty
  if (!(await checkRateLimit(`verify:user:${user.id}`, 10, 60))) {
    return rateLimitResponse(60);
  }

  // Find the user's most recent pending payment
  const { data: pendingPayments } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  if (!pendingPayments || pendingPayments.length === 0) {
    return NextResponse.json({ message: "No pending payments", credited: 0 });
  }

  let totalCredited = 0;

  for (const payment of pendingPayments) {
    try {
      // Verify with Stripe that the session was actually paid
      const session = await stripe.checkout.sessions.retrieve(payment.stripe_session_id);

      if (session.payment_status !== "paid") {
        continue; // Not paid yet, skip
      }

      const credits = payment.credits_purchased;
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null;

      // Race-free idempotency: atomically claim the pending payment.
      // If the webhook (or another verify call) got here first, zero rows
      // come back and we skip — impossible to double-credit.
      const { data: claimed } = await supabaseAdmin
        .from("payments")
        .update({
          status: "completed",
          stripe_payment_intent_id: paymentIntentId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id)
        .eq("status", "pending")
        .select("id");

      if (!claimed || claimed.length === 0) {
        continue; // Already processed by webhook or a concurrent verify call
      }

      // Atomic credit add via DB function
      const { error: creditError } = await supabaseAdmin.rpc("add_credits", {
        p_user_id: user.id,
        p_amount: credits,
      });
      if (creditError) throw creditError;

      // Log transaction
      await supabaseAdmin.from("credit_transactions").insert({
        user_id: user.id,
        amount: credits,
        type: "purchase",
        description: `Purchased ${credits} credits`,
        stripe_payment_id: paymentIntentId,
      });

      totalCredited += credits;
    } catch (err) {
      console.error("Error verifying payment:", payment.stripe_session_id, err);
    }
  }

  return NextResponse.json({
    message: totalCredited > 0 ? "Credits added!" : "No new credits to add",
    credited: totalCredited,
  });
}
