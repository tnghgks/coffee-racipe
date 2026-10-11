export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6" aria-busy="true" aria-label="불러오는 중">
      <div className="h-16 w-48 animate-pulse rounded-xl bg-muted" />
      <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
      <div className="h-14 w-40 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
