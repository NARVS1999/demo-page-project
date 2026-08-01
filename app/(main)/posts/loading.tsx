// Posts loading — skeleton table rows.
import { PostsTableSkeleton } from "@/components/posts/posts-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function PostsLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-xl border">
        <PostsTableSkeleton />
      </div>
    </div>
  );
}
