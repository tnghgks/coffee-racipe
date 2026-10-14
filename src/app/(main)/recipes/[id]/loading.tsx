export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="레시피 불러오는 중">
      <div className="h-5 w-24 animate-pulse rounded bg-muted" />
      <div className="aspect-video max-h-80 w-full animate-pulse rounded-2xl bg-muted" />
      <div className="h-8 w-3/4 animate-pulse rounded-md bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
