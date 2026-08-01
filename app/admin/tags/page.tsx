// Admin tags (UI-SPEC Page 9) — protected by /admin layout + proxy; actions
// re-verify auth per 01-01 Task 4. force-dynamic; post counts via LEFT JOIN
// on post_tags (tags with zero posts stay listed).

import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TagDialog } from "@/components/admin/tag-dialog";
import { CmsTagTable, type TagRow } from "@/components/admin/cms-tag-table";

export const dynamic = "force-dynamic";

export default async function AdminTagsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/tags");

  const rows = (await sql`
    SELECT t.id, t.name, t.slug, t.created_at, count(pt.post_id)::int AS post_count
    FROM tags t
    LEFT JOIN post_tags pt ON pt.tag_id = t.id
    GROUP BY t.id
    ORDER BY t.name`) as {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    post_count: number;
  }[];

  const tags: TagRow[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    postCount: row.post_count,
  }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Tags"
        description="Manage blog tags"
        action={
          <TagDialog
            mode="create"
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                New tag
              </Button>
            }
          />
        }
      />
      <div className="rounded-xl border">
        <CmsTagTable tags={tags} />
      </div>
    </div>
  );
}
