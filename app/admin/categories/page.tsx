// Admin categories (UI-SPEC Page 8) — protected by /admin layout + proxy;
// actions re-verify auth per 01-01 Task 4. force-dynamic; post counts via
// LEFT JOIN (uncategorized posts keep categories visible at 0).

import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { CategoryDialog } from "@/components/admin/category-dialog";
import { CmsCategoryTable, type CategoryRow } from "@/components/admin/cms-category-table";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/categories");

  const rows = (await sql`
    SELECT c.id, c.name, c.slug, c.created_at, count(p.id)::int AS post_count
    FROM categories c
    LEFT JOIN posts p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name`) as {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    post_count: number;
  }[];

  const categories: CategoryRow[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    postCount: row.post_count,
  }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Categories"
        description="Manage blog categories"
        action={
          <CategoryDialog
            mode="create"
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                New category
              </Button>
            }
          />
        }
      />
      <div className="rounded-xl border">
        <CmsCategoryTable categories={categories} />
      </div>
    </div>
  );
}
