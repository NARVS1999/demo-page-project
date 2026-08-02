// /admin/bookings loading skeleton — filter-bar (2 select blocks) + 5 table
// rows (UI-SPEC Page 4 states, Visual Quality Bar #5).

export default function AdminBookingsLoading() {
  return (
    <div className="flex flex-col gap-8" aria-label="Loading bookings">
      <div className="flex flex-col gap-3">
        <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="rounded-xl border">
        <div className="flex flex-wrap gap-4 border-b border-border bg-card px-4 py-3">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex h-14 items-center gap-4 border-b px-4 last:border-b-0">
            <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-40 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-36 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
            <div className="ml-auto h-4 w-24 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
