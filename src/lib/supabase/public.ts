import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/**
 * Cookie-less anon client for data that is the same for every visitor (public recipes, drippers).
 * Safe to call inside `use cache` because it never reads the request.
 */
export function createPublicClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
