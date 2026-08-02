import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutLoading() {
  return <div className="flex flex-col gap-8" aria-label="Loading checkout"><div className="flex flex-col gap-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-12 w-48" /><Skeleton className="h-5 w-80" /></div><div className="grid gap-6 md:grid-cols-2"><div className="flex flex-col gap-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /></div><Skeleton className="h-64 w-full" /></div></div>;
}
