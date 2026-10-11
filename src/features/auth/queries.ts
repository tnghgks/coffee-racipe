import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { loginHref, safeNextPath } from "./paths";

// Session-aware reads. They touch cookies, so callers must render inside <Suspense> (or a loading.tsx),
// and they are never wrapped in "use cache". React cache() dedupes them within one request.

export type Profile = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: "user" | "admin";
};

/** The signed-in user's id and email from the verified JWT, or null. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load profile: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    bio: data.bio,
    role: data.role,
  };
});

/** Admin check for the app (RLS uses the matching DB function public.is_admin()). */
export async function isAdmin(): Promise<boolean> {
  return (await getMyProfile())?.role === "admin";
}

/** For admin-only pages: 404 for everyone else, so the page's existence isn't advertised. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getMyProfile();
  if (profile?.role !== "admin") notFound();
  return profile;
}

/**
 * For pages under /me: requires a signed-in user who has picked a username.
 * The proxy already redirects anonymous visitors; this also covers a session that expired mid-request.
 */
export async function requireProfile(currentPath: string): Promise<Profile & { username: string }> {
  const profile = await getMyProfile();
  if (!profile) redirect(loginHref(currentPath));
  if (!profile.username) redirect(`/me/setup?next=${encodeURIComponent(currentPath)}`);
  return { ...profile, username: profile.username };
}

/** Where to go after signing in: the profile setup first if the user has no username yet. */
export async function afterLoginPath(next: string | null): Promise<string> {
  const target = safeNextPath(next);
  const profile = await getMyProfile();
  return !profile || profile.username ? target : `/me/setup?next=${encodeURIComponent(target)}`;
}
