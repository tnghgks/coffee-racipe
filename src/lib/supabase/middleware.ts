import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv, hasSupabaseEnv } from "./env";

/** Refreshes the Supabase auth session and writes updated cookies onto the response. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Keep the app usable (e.g. CI, a fresh preview) before Supabase is configured; /status reports it.
  if (!hasSupabaseEnv()) {
    return response;
  }

  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Do not run code between createServerClient and getClaims():
  // it triggers the token refresh that keeps the session alive.
  await supabase.auth.getClaims();

  return response;
}
