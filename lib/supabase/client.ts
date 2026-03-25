import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase browser client using the public NEXT_PUBLIC_* env vars.
 * Safe to use in client components ("use client").
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}