import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase browser client using the public NEXT_PUBLIC_* env vars.
 * Safe to use in client components ("use client").
 *
 * NOTE: SUPABASE_SERVICE_ROLE_KEY must never be used here — it is server-only.
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
