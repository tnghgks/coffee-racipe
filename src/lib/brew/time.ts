/** Formats seconds as m:ss (e.g. 105 → "1:45"). Negative values clamp to 0. */
export function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Parses what people type for a time: "1:45" (m:ss), "0:05", or plain seconds "45".
 * Returns null for anything else (e.g. "1:75", "-3", "abc").
 */
export function parseClock(text: string): number | null {
  const value = text.trim();
  const clock = /^(\d{1,3}):([0-5]\d)$/.exec(value);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  if (/^\d{1,4}$/.test(value)) return Number(value);
  return null;
}
