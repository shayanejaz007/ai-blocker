import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client.
 *
 * Created lazily rather than at module scope. Building at module scope threw
 * "supabaseUrl is required" during `next build` for any route that merely
 * imports this file (e.g. via the rate limiter), even routes that never touch
 * the database. Lazy init means the client is only constructed on the first
 * real call, at request time, when env vars are present.
 */
let client: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase admin client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

// Proxy keeps the existing `supabaseAdmin.from(...)` / `.rpc(...)` call sites
// working unchanged while deferring construction until first use.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getAdminClient(), prop, receiver);
    return typeof value === "function" ? value.bind(getAdminClient()) : value;
  },
});
