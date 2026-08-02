import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <div className="grid gap-8 md:grid-cols-2" aria-label="Loading product">
      <Skeleton className="aspect-square w-full" />
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-12 w-4/5" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
