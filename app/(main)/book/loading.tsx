// /book loading skeleton — kicker/title lines + 3 service-card blocks + 3
// date-groups (header line + 6 pill blocks each) mirroring the final flow
// (UI-SPEC Page 2 states, Visual Quality Bar #5).

export default function BookLoading() {
  return (
    <div className="flex flex-col gap-8" aria-label="Loading booking flow">
      <div className="flex flex-col gap-3">
        <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-56 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
      <div className="flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, g) => (
          <div key={g} className="flex flex-col gap-2">
            <div className="h-3 w-32 animate-pulse rounded-md bg-muted" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, p) => (
                <div key={p} className="h-10 w-20 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
