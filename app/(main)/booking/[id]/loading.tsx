// /booking/[id] loading skeleton — summary-card rows (UI-SPEC Page 3 states,
// Visual Quality Bar #5: skeletons mirror the final 6-row summary card).

export default function BookingLoading() {
  return (
    <div className="flex flex-col gap-8" aria-label="Loading booking details">
      <div className="flex flex-col gap-3">
        <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex flex-col divide-y divide-border rounded-xl border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
