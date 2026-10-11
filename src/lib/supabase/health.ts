import "server-only";

import { getSupabaseEnv } from "./env";

export type SupabaseHealth =
  | { ok: true; url: string; latencyMs: number }
  | { ok: false; url: string | null; error: string };

/** Pings the Supabase Auth health endpoint to verify the app can reach the project. */
export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  let env: ReturnType<typeof getSupabaseEnv>;
  try {
    env = getSupabaseEnv();
  } catch (error) {
    return { ok: false, url: null, error: (error as Error).message };
  }

  const startedAt = performance.now();
  try {
    const res = await fetch(`${env.url}/auth/v1/health`, {
      headers: { apikey: env.publishableKey },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return { ok: false, url: env.url, error: `HTTP ${res.status}` };
    }
    return { ok: true, url: env.url, latencyMs: Math.round(performance.now() - startedAt) };
  } catch (error) {
    return { ok: false, url: env.url, error: (error as Error).message };
  }
}
