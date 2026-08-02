// My bookings loading — header + 5 list-row skeletons.
import { Skeleton } from "@/components/ui/skeleton";

export default function MyBookingsLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col rounded-xl border">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-none border-b last:border-b-0" />
        ))}
      </div>
    </div>
  );
}
