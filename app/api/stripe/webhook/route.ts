import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.arrayBuffer();
  const buf = Buffer.from(body);
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── Initial subscription checkout ──────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits || "0", 10);

    if (!userId || credits <= 0 || credits > 10000) {
      console.error("Invalid webhook metadata:", { userId, credits });
      return NextResponse.json({ received: true });
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as Stripe.PaymentIntent)?.id || null;

    try {
      // Race-free idempotency: only flips pending -> completed once.
      // If a concurrent webhook/verify call already completed it, zero rows
      // come back and we skip crediting (no double-credit).
      const { data: claimed } = await supabaseAdmin
        .from("payments")
        .update({ status: "completed", stripe_payment_intent_id: paymentIntentId, updated_at: new Date().toISOString() })
        .eq("stripe_session_id", session.id)
        .eq("status", "pending")
        .select("id");

      if (!claimed || claimed.length === 0) {
        console.log("Webhook already processed for session:", session.id);
        return NextResponse.json({ received: true });
      }

      await addCredits(userId, credits, `${session.metadata?.plan || "unknown"} plan — initial subscription`, paymentIntentId);
    } catch (err) {
      console.error("Error processing checkout webhook:", err);
      return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
  }

  // ── Monthly renewal — top up credits automatically ───────────────────────
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;

    // Skip the first invoice — already handled by checkout.session.completed
    if (invoice.billing_reason === "subscription_create") {
      return NextResponse.json({ received: true });
    }

    const rawSub = (invoice as unknown as { subscription?: string | Stripe.Subscription }).subscription;
    const subscriptionId = typeof rawSub === "string" ? rawSub : rawSub?.id;

    if (!subscriptionId) return NextResponse.json({ received: true });

    try {
      // Get subscription metadata to find user_id + plan
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.user_id;
      const credits = parseInt(subscription.metadata?.credits || "0", 10);
      const plan = subscription.metadata?.plan || "unknown";

      if (!userId || credits <= 0) {
        console.error("Missing subscription metadata:", { userId, credits });
        return NextResponse.json({ received: true });
      }

      await addCredits(userId, credits, `${plan} plan — monthly renewal`, invoice.id);
    } catch (err) {
      console.error("Error processing renewal webhook:", err);
      return NextResponse.json({ error: "Renewal processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

// ── Shared helper ────────────────────────────────────────────────────────────
async function addCredits(userId: string, credits: number, description: string, paymentRef: string | null) {
  // Atomic upsert-increment via DB function — safe under concurrent webhooks.
  const { error } = await supabaseAdmin.rpc("add_credits", { p_user_id: userId, p_amount: credits });
  if (error) throw error;

  await supabaseAdmin.from("credit_transactions").insert({
    user_id: userId,
    amount: credits,
    type: "purchase",
    description,
    stripe_payment_id: paymentRef,
  });
}
