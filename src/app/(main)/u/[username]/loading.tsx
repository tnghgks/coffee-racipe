export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="불러오는 중">
      <div className="flex items-center gap-4">
        <div className="size-18 animate-pulse rounded-full bg-muted" />
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-36 animate-pulse rounded-xl bg-muted" />
        <div className="h-36 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
