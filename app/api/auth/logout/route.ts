import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Return JSON instead of redirect (client-side handles navigation)
  return NextResponse.json({ success: true });
}
