// Global route loading state: skeleton composition (no full-page spinner).
export default function Loading() {
  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-32 animate-pulse rounded-xl border bg-muted/50" />
      <div className="h-32 animate-pulse rounded-xl border bg-muted/50" />
    </div>
  );
}
