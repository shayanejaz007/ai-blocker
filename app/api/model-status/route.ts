import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Light per-IP rate limit — this endpoint proxies to the model server
  const ip = getClientIp(request);
  if (!(await checkRateLimit(`model-status:ip:${ip}`, 30, 60))) {
    return rateLimitResponse(60);
  }

  const modelUrl = process.env.MODEL_API_URL || "http://localhost:8000";
  const headers: Record<string, string> = {};
  if (process.env.MODEL_API_KEY) headers["X-API-Key"] = process.env.MODEL_API_KEY;

  try {
    const res = await fetch(`${modelUrl}/health/detail`, {
      headers,
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const data = await res.json();

    // Only expose what the frontend needs — never internal error strings,
    // device info, or stack details from the backend.
    return NextResponse.json({
      status: data.status === "ok" ? "ok" : data.status === "error" ? "error" : "loading",
      model_loaded: Boolean(data.model_loaded),
      elapsed_seconds: typeof data.elapsed_seconds === "number" ? data.elapsed_seconds : null,
    });
  } catch {
    return NextResponse.json({ status: "unreachable", model_loaded: false }, { status: 200 });
  }
}
