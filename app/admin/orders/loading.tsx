import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOrdersLoading() {
  return <div className="flex flex-col gap-8" aria-label="Loading orders"><div className="flex flex-col gap-3"><Skeleton className="h-9 w-40" /><Skeleton className="h-4 w-72" /></div><div className="border border-border"><div className="border-b px-4 py-3"><Skeleton className="h-10 w-40" /></div>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="mx-4 my-4 h-12 w-[calc(100%-2rem)]" />)}</div></div>;
}
