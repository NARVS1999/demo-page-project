import { Skeleton } from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <div className="flex flex-col gap-8" aria-label="Loading cart">
      <div className="flex flex-col gap-3"><Skeleton className="h-4 w-36" /><Skeleton className="h-12 w-48" /><Skeleton className="h-5 w-72" /></div>
      <div className="border border-border p-4"><Skeleton className="h-12 w-full" />{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="mt-4 h-20 w-full" />)}</div>
    </div>
  );
}
