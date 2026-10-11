"use server";

import { refresh, revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { safeNextPath } from "./paths";
import { afterLoginPath, getCurrentUser } from "./queries";
import { devLoginSchema, profileSchema, type ProfileInput } from "./schema";

export type OAuthProvider = "google" | "kakao";

/**
 * Who is signed in shows up in shared layouts (the header avatar), and layouts are kept across navigations.
 * After the session or profile changes, purge the client router cache so they re-render.
 */
function revalidateSession() {
  revalidatePath("/", "layout");
}

async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}

/** Starts the OAuth flow; the provider sends the user back to /auth/callback. */
export async function signInWithOAuth(provider: OAuthProvider, next: string) {
  const supabase = await createClient();
  const callback = new URL("/auth/callback", await siteOrigin());
  callback.searchParams.set("next", safeNextPath(next));

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback.toString() },
  });
  if (error || !data.url) redirect(`/login?error=oauth&next=${encodeURIComponent(safeNextPath(next))}`);
  redirect(data.url);
}

export type DevLoginState = { error?: string };

/**
 * Local/CI only: email + password sign-in that signs up on first use. Requires NEXT_PUBLIC_DEV_LOGIN=1
 * here and email auth enabled in Supabase (it is disabled in the cloud project).
 */
export async function devLogin(_prev: DevLoginState, formData: FormData): Promise<DevLoginState> {
  if (process.env.NEXT_PUBLIC_DEV_LOGIN !== "1") return { error: "개발용 로그인이 꺼져 있어요." };

  const parsed = devLoginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };

  const supabase = await createClient();
  const { email, password } = parsed.data;
  let { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === "invalid_credentials") {
    ({ error } = await supabase.auth.signUp({ email, password }));
  }
  if (error) return { error: error.message };

  revalidateSession();
  redirect(await afterLoginPath(String(formData.get("next") ?? "/")));
}

export type ProfileFormState = {
  ok?: boolean;
  fieldErrors?: Partial<Record<keyof ProfileInput, string>>;
  error?: string;
};

export async function saveProfile(values: ProfileInput, next: string | null): Promise<ProfileFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: ProfileFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ProfileInput;
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { username, displayName, bio } = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({ username, display_name: displayName, bio: bio || null })
    .eq("id", user.id);

  if (error?.code === "23505") return { fieldErrors: { username: "이미 사용 중인 이름이에요" } };
  if (error) return { error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };

  revalidateSession();
  if (next !== null) redirect(safeNextPath(next, "/me"));
  refresh();
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidateSession();
  redirect("/");
}
