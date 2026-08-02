import { Skeleton } from "@/components/ui/skeleton";

export default function OrderLoading() {
  return <div className="flex flex-col gap-8" aria-label="Loading order"><div className="flex flex-col gap-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-12 w-full max-w-xl" /><Skeleton className="h-5 w-72" /></div><div className="grid gap-6 md:grid-cols-2"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div></div>;
}
