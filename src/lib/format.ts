/** Rounds down to one decimal and drops a trailing ".0" (never shows more than the real count). */
function oneDecimal(value: number): string {
  return String(Math.floor(value * 10) / 10);
}

/** 986 → "986", 1234 → "1.2천", 12345 → "1.2만", 123456 → "12만" */
export function formatCount(count: number): string {
  if (count < 1_000) return String(count);
  if (count < 10_000) return `${oneDecimal(count / 1_000)}천`;
  if (count < 100_000) return `${oneDecimal(count / 10_000)}만`;
  return `${Math.floor(count / 10_000).toLocaleString("ko-KR")}만`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "방금 전", "5분 전", "3시간 전", "2일 전", then a Seoul date ("2026. 10. 1."). */
export function formatTimeAgo(iso: string, now: number): string {
  const elapsed = Math.max(now - Date.parse(iso), 0);
  if (elapsed < MINUTE) return "방금 전";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간 전`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}
