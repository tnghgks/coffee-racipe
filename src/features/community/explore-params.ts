/** /explore query params, filter presets and the pagination cursor (pure, shared by page and API route). */

export const exploreSorts = ["popular", "latest"] as const;
export type ExploreSort = (typeof exploreSorts)[number];

export const strengthPresets = {
  strong: { label: "진하게", hint: "1:15 이하", min: null, max: 15 },
  medium: { label: "보통", hint: "1:15–1:17", min: 15, max: 17 },
  light: { label: "연하게", hint: "1:17 이상", min: 17, max: null },
} as const;
export type Strength = keyof typeof strengthPresets;

export const timePresets = {
  "180": { label: "3분 이내", seconds: 180 },
  "240": { label: "4분 이내", seconds: 240 },
} as const;
export type TimeLimit = keyof typeof timePresets;

export type ExploreParams = {
  q: string | null;
  dripper: string | null;
  strength: Strength | null;
  time: TimeLimit | null;
  sort: ExploreSort;
};

type RawSearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const oneOf = <T extends string>(value: string | undefined, options: readonly T[]) =>
  options.includes(value as T) ? (value as T) : null;

export const MAX_QUERY_LENGTH = 50;

/** Unknown or malformed values fall back to defaults instead of erroring. */
export function parseExploreParams(searchParams: RawSearchParams): ExploreParams {
  const q = first(searchParams.q)?.trim().slice(0, MAX_QUERY_LENGTH);
  const dripper = first(searchParams.dripper)?.trim().toLowerCase();
  return {
    q: q || null,
    dripper: dripper && /^[a-z0-9-]{1,50}$/.test(dripper) ? dripper : null,
    strength: oneOf(first(searchParams.strength), Object.keys(strengthPresets) as Strength[]),
    time: oneOf(first(searchParams.time), Object.keys(timePresets) as TimeLimit[]),
    sort: oneOf(first(searchParams.sort), exploreSorts) ?? "popular",
  };
}

/** Builds a query string (without "?"), omitting defaults. */
export function exploreQueryString(params: ExploreParams, extra: Record<string, string> = {}): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.dripper) query.set("dripper", params.dripper);
  if (params.strength) query.set("strength", params.strength);
  if (params.time) query.set("time", params.time);
  if (params.sort !== "popular") query.set("sort", params.sort);
  for (const [key, value] of Object.entries(extra)) query.set(key, value);
  return query.toString();
}

export function exploreHref(params: ExploreParams): string {
  const qs = exploreQueryString(params);
  return qs ? `/explore?${qs}` : "/explore";
}

/** Arguments for the explore_recipe_ids database function. */
export function toRpcFilters(params: ExploreParams) {
  const strength = params.strength ? strengthPresets[params.strength] : null;
  return {
    query: params.q ?? undefined,
    dripper_slug: params.dripper ?? undefined,
    ratio_min: strength?.min ?? undefined,
    ratio_max: strength?.max ?? undefined,
    time_max: params.time ? timePresets[params.time].seconds : undefined,
    sort: params.sort,
  };
}

/**
 * Keyset cursor: the last row's sort key and id, plus the timestamp the popularity score was computed at,
 * so every page of one feed session ranks recipes the same way.
 */
/** key is the database's integer sort key (bigint, always below 2^53), so it round-trips through JSON exactly. */
export type ExploreCursor = { key: number; id: string; at: string };

// base64url via btoa/atob so this module also works in the browser (no Node Buffer).
function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(raw: string): string {
  const binary = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function encodeCursor(cursor: ExploreCursor): string {
  return toBase64Url(JSON.stringify(cursor));
}

export function decodeCursor(raw: string | null | undefined): ExploreCursor | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(fromBase64Url(raw)) as Partial<ExploreCursor>;
    if (
      typeof value.key === "number" &&
      Number.isSafeInteger(value.key) &&
      typeof value.id === "string" &&
      /^[0-9a-f-]{36}$/i.test(value.id) &&
      typeof value.at === "string" &&
      !Number.isNaN(Date.parse(value.at))
    ) {
      return { key: value.key, id: value.id, at: value.at };
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Popularity is computed "as of" a moment. Rounding it to 10 minutes lets the first page of a feed be
 * cached and shared, while every following page reuses the same moment via the cursor.
 */
export function feedMoment(now = Date.now()): string {
  const bucket = 10 * 60 * 1000;
  return new Date(Math.floor(now / bucket) * bucket).toISOString();
}
