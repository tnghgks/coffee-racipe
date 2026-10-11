/** Routes that require a signed-in user; the proxy redirects to /login otherwise. */
export const PROTECTED_PREFIXES = ["/me", "/recipes/new"] as const;
const PROTECTED_PATTERNS = [/^\/recipes\/[^/]+\/edit\/?$/];

export function isProtectedPath(pathname: string): boolean {
  return (
    PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname))
  );
}

/**
 * Only allows in-app absolute paths for post-login redirects ("/me", "/recipes?x=1").
 * Anything that could leave the site ("//evil.com", "https://…", "/\evil") falls back to "/".
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  try {
    const url = new URL(next, "http://local.invalid");
    if (url.origin !== "http://local.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function loginHref(next?: string): string {
  const safe = safeNextPath(next, "");
  return safe && safe !== "/" ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}
