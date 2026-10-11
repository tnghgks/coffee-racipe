import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isProtectedPath, loginHref } from "@/features/auth/paths";

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
  const { data } = await supabase.auth.getClaims();

  // Optimistic gate for signed-in areas; pages still check via requireProfile().
  const { pathname, search } = request.nextUrl;
  if (!data?.claims && isProtectedPath(pathname)) {
    const redirect = NextResponse.redirect(new URL(loginHref(`${pathname}${search}`), request.url));
    // Keep any cookies the refresh attempt wrote (e.g. clearing an expired session).
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}
