export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="레시피 불러오는 중">
      <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-9 w-20 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
