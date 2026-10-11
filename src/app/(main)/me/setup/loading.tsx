export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4" aria-busy="true" aria-label="불러오는 중">
      <div className="h-16 animate-pulse rounded-xl bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
