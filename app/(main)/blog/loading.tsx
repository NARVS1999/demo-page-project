// /blog loading skeleton — Features grid of 9 placeholder cards (UI-SPEC).
export default function BlogLoading() {
  return (
    <div className="flex flex-col gap-8" aria-label="Loading stories">
      <div className="flex flex-col gap-3">
        <div className="h-4 w-24 animate-pulse bg-muted" />
        <div className="h-9 w-56 animate-pulse bg-muted" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="aspect-[3/2] animate-pulse bg-muted" />
            <div className="h-3 w-20 animate-pulse bg-muted" />
            <div className="h-6 w-4/5 animate-pulse bg-muted" />
            <div className="h-4 w-full animate-pulse bg-muted" />
            <div className="h-4 w-2/3 animate-pulse bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
