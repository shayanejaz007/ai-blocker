import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const CREDITS_PER_SCAN = 1;
const CREDITS_PER_VIDEO = 3;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/avi", "video/quicktime", "video/webm", "video/x-matroska"];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Rate limiting: per-user and per-IP (distributed, DB-backed) ──────────
  const ip = getClientIp(request);
  const [userOk, ipOk] = await Promise.all([
    checkRateLimit(`predict:user:${user.id}`, 10, 60), // 10 scans / min / user
    checkRateLimit(`predict:ip:${ip}`, 30, 60),        // 30 scans / min / IP
  ]);
  if (!userOk || !ipOk) {
    return rateLimitResponse(60);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File;
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 50 MB." },
      { status: 413 }
    );
  }

  // Validate file type (don't trust MIME type alone — also check extension)
  const ext = (file.name || "").split(".").pop()?.toLowerCase() || "";
  const validImageExts = ["jpg", "jpeg", "png", "webp", "bmp", "tiff"];
  const validVideoExts = ["mp4", "avi", "mov", "webm", "mkv", "flv", "wmv"];
  const validExts = [...validImageExts, ...validVideoExts];

  if (!ALLOWED_TYPES.includes(file.type) && !validExts.includes(ext)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload an image (JPG, PNG, WebP) or video (MP4, AVI, MOV, WebM)." },
      { status: 400 }
    );
  }

  const isVideo = file.type.startsWith("video/") || validVideoExts.includes(ext);
  const creditsNeeded = isVideo ? CREDITS_PER_VIDEO : CREDITS_PER_SCAN;

  // Atomically deduct credits via database RPC (prevents race conditions / double-spend)
  const { data: newBalance, error: deductError } = await supabaseAdmin
    .rpc("deduct_credits", { p_user_id: user.id, p_amount: creditsNeeded });

  if (deductError) {
    console.error("Credit deduction RPC error:", deductError);
    return NextResponse.json({ error: "Failed to process credits" }, { status: 500 });
  }

  if (newBalance === -1) {
    // RPC returns -1 when balance < amount
    const { data: balance } = await supabaseAdmin
      .from("credit_balances")
      .select("balance")
      .eq("user_id", user.id)
      .single();
    return NextResponse.json(
      { error: "insufficient_credits", creditsNeeded, currentBalance: balance?.balance ?? 0 },
      { status: 402 }
    );
  }

  const updatedBalance = { balance: newBalance as number };

  const modelUrl = process.env.MODEL_API_URL || "http://localhost:8000";
  const modelHeaders: Record<string, string> = {};
  if (process.env.MODEL_API_KEY) modelHeaders["X-API-Key"] = process.env.MODEL_API_KEY;

  // Atomic refund (avoids clobbering concurrent balance changes)
  const refundCredits = () =>
    supabaseAdmin.rpc("add_credits", { p_user_id: user.id, p_amount: creditsNeeded });

  // Forward directly to model — FastAPI returns 503 itself when not ready
  const modelFormData = new FormData();
  modelFormData.append("file", file);

  let modelResponse: Response;
  try {
    modelResponse = await fetch(`${modelUrl}/predict`, {
      method: "POST",
      headers: modelHeaders,
      body: modelFormData,
      signal: AbortSignal.timeout(120000),
    });
  } catch (err) {
    await refundCredits();
    console.error("Model API connection error:", err);
    return NextResponse.json(
      { error: "model_loading", details: "Cannot reach model server. Credits refunded." },
      { status: 503 }
    );
  }

  if (modelResponse.status === 503) {
    // Model is still warming up — refund and tell frontend to wait
    await refundCredits();
    return NextResponse.json(
      { error: "model_loading", details: "Model is warming up. Please wait." },
      { status: 503 }
    );
  }

  if (!modelResponse.ok) {
    await refundCredits();
    return NextResponse.json(
      { error: "Model API error", details: "Analysis failed. Credits have been refunded." },
      { status: 502 }
    );
  }

  const result = await modelResponse.json();

  // Validate model response has expected fields
  if (!result.prediction || typeof result.confidence !== "number") {
    // Refund on invalid response (atomic)
    await refundCredits();

    return NextResponse.json(
      { error: "Invalid model response. Credits have been refunded." },
      { status: 502 }
    );
  }

  // Log credit transaction
  await supabaseAdmin.from("credit_transactions").insert({
    user_id: user.id,
    amount: -creditsNeeded,
    type: "usage",
    description: `${isVideo ? "Video" : "Image"} scan: ${file.name.slice(0, 255)}`,
  });

  // Save scan record (sanitize filename)
  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255);
  await supabaseAdmin.from("image_scans").insert({
    user_id: user.id,
    filename: safeFilename,
    file_type: result.type || (isVideo ? "video" : "image"),
    prediction: result.prediction,
    confidence: result.confidence,
    fake_probability: result.fake_probability ?? 0,
    real_probability: result.real_probability ?? 0,
    frames_analyzed: result.frames_analyzed || null,
    credits_used: creditsNeeded,
  });

  return NextResponse.json({
    ...result,
    creditsUsed: creditsNeeded,
    creditsRemaining: updatedBalance.balance,
  });
}
