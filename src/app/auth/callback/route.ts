import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/features/auth/paths";
import { afterLoginPath } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";

/** OAuth redirect target: trades the one-time code for a session cookie, then continues. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(await afterLoginPath(next), origin));
  }

  // Missing code, provider error (?error=…), or an expired/used code.
  return NextResponse.redirect(new URL(`/login?error=oauth&next=${encodeURIComponent(next)}`, origin));
}
