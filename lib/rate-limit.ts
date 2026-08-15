import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Distributed fixed-window rate limiter backed by Postgres (supabase/schema.sql
 * defines public.check_rate_limit). Works correctly across Vercel serverless
 * instances, unlike in-memory maps.
 *
 * Returns true if the request is ALLOWED, false if rate-limited.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      // Fail open so a DB hiccup doesn't take the whole product down,
      // but log loudly so it's visible.
      console.error("Rate limit RPC error:", error);
      return true;
    }
    return data === true;
  } catch (err) {
    console.error("Rate limit check failed:", err);
    return true;
  }
}

/** Best-effort client IP for per-IP limits (Vercel sets x-forwarded-for). */
export function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export function rateLimitResponse(retryAfterSeconds = 60) {
  return new Response(
    JSON.stringify({ error: "rate_limited", details: "Too many requests. Please slow down." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}
