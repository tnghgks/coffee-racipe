/** "James Hoffmann" → "JH", "Tetsu Kasuya" → "TK" */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function SourceCredit({ name, url, note }: { name: string; url: string | null; note: string | null }) {
  return (
    <aside aria-label="원작자" className="flex items-start gap-3 rounded-xl border bg-card/60 p-3">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
      >
        {initials(name)}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm">
          <span className="text-muted-foreground">원작 · </span>
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium underline">
              {name}
            </a>
          ) : (
            <span className="font-medium">{name}</span>
          )}
        </p>
        {note && <p className="text-xs leading-relaxed text-muted-foreground">{note}</p>}
      </div>
    </aside>
  );
}
