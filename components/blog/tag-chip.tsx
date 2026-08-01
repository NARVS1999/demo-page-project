// Tag chip (server): Badge outline, rounded-none, links to /blog/tag/[slug]
// (UI-SPEC Component Inventory).

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function TagChip({ name, slug }: { name: string; slug: string }) {
  return (
    <Badge variant="outline" className="rounded-none hover:bg-muted" asChild>
      <Link href={`/blog/tag/${slug}`}>{name}</Link>
    </Badge>
  );
}
