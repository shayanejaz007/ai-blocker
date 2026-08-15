import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ── Subscription plans (monthly) ────────────────────────────────────────────
const SUBSCRIPTION_PLANS: Record<string, { price: string; credits: number; amount: number }> = {
  starter: {
    price: process.env.STRIPE_PRICE_STARTER!,
    credits: 25,
    amount: 989,
  },
  pro: {
    price: process.env.STRIPE_PRICE_PRO!,
    credits: 75,
    amount: 2889,
  },
  enterprise: {
    price: process.env.STRIPE_PRICE_ENTERPRISE!,
    credits: 175,
    amount: 7998,
  },
};

// ── One-time credit packs ────────────────────────────────────────────────────
const ONETIME_PLANS: Record<string, { price: string; credits: number; amount: number }> = {
  pack_s: {
    price: process.env.STRIPE_PRICE_PACK_S!,
    credits: 10,
    amount: 299,
  },
  pack_m: {
    price: process.env.STRIPE_PRICE_PACK_M!,
    credits: 35,
    amount: 799,
  },
  pack_l: {
    price: process.env.STRIPE_PRICE_PACK_L!,
    credits: 80,
    amount: 1499,
  },
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 5 checkout sessions / min / user
  if (!(await checkRateLimit(`checkout:user:${user.id}`, 5, 60))) {
    return rateLimitResponse(60);
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const plan = body.plan;
  if (!plan || typeof plan !== "string") {
    return NextResponse.json({ error: "Missing plan parameter" }, { status: 400 });
  }

  // Determine mode + plan config
  const isOnetime = plan.startsWith("pack_");
  const planConfig = isOnetime ? ONETIME_PLANS[plan] : SUBSCRIPTION_PLANS[plan];

  if (!planConfig) {
    return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
  }

  if (!planConfig.price) {
    return NextResponse.json(
      { error: "This plan is not configured yet. Please contact support." },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [{ price: planConfig.price, quantity: 1 }],
      mode: isOnetime ? "payment" : "subscription",
      success_url: `${appUrl}/dashboard?payment=success`,
      cancel_url: `${appUrl}/pricing?payment=cancelled`,
      metadata: {
        user_id: user.id,
        plan,
        credits: planConfig.credits.toString(),
      },
      customer_email: user.email,
    };

    // Attach metadata to subscription for renewal webhooks
    if (!isOnetime) {
      sessionParams.subscription_data = {
        metadata: {
          user_id: user.id,
          plan,
          credits: planConfig.credits.toString(),
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    await supabaseAdmin.from("payments").insert({
      user_id: user.id,
      stripe_session_id: session.id,
      amount_cents: planConfig.amount,
      credits_purchased: planConfig.credits,
      status: "pending",
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
