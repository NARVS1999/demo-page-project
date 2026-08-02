// /services loading skeleton — 3 card blocks mirroring the final grid
// (UI-SPEC Page 1 states, Visual Quality Bar #5).

export default function ServicesLoading() {
  return (
    <div className="flex flex-col gap-8" aria-label="Loading services">
      <div className="flex flex-col gap-3">
        <div className="h-4 w-44 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}
