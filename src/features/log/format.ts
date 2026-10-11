// Dates are formatted in Korea time explicitly, so the server (UTC) and the browser agree.
const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** "10월 11일 (토) 오전 8:30" */
export function formatBrewedAt(iso: string): string {
  const parts = Object.fromEntries(dateFormat.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.month} ${parts.day}일 (${parts.weekday}) ${parts.dayPeriod} ${parts.hour}:${parts.minute}`;
}
