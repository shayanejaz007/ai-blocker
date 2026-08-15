import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Allowed redirect paths after auth callback (prevent open redirect)
const ALLOWED_REDIRECTS = ["/dashboard", "/upload", "/pricing"];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";

  // Sanitize redirect: must be a relative path starting with / and in allowlist
  const next = ALLOWED_REDIRECTS.includes(rawNext) ? rawNext : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback_error`);
}
