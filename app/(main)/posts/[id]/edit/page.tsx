// Edit post (UI-SPEC Page 7) — protected, force-dynamic.
// Ownership enforced on READ too: a post that isn't the current user's → 404
// (IDOR posture inherited). Prefill now includes slug/category/cover/tags for
// the EditorShell (01-02 Task 3).
import { notFound, redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isUuid } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EditorShell } from "@/components/posts/editor-shell";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/posts");

  const { id } = await params;

  // Non-UUID ids would throw in Postgres → 500; treat them as not found (IN-01).
  if (!isUuid(id)) notFound();

  const rows = await sql`
    SELECT p.id, p.title, p.content, p.status, p.slug, p.category_id, p.cover_image,
           COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tag_names
    FROM posts p
    LEFT JOIN post_tags pt ON pt.post_id = p.id
    LEFT JOIN tags t ON t.id = pt.tag_id
    WHERE p.id = ${id} AND p.author_id = ${user.id}
    GROUP BY p.id`;
  if (rows.length === 0) notFound();
  const post = rows[0] as {
    id: string;
    title: string;
    content: string;
    status: "draft" | "published";
    slug: string | null;
    category_id: string | null;
    cover_image: string | null;
    tag_names: string[];
  };

  const categoryRows = await sql`SELECT id, name FROM categories ORDER BY name`;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Edit post" />
      <div className="max-w-5xl rounded-xl border p-6">
        <EditorShell
          mode="edit"
          post={{
            id: post.id,
            title: post.title,
            content: post.content,
            status: post.status,
            slug: post.slug ?? "",
            categoryId: post.category_id,
            coverImage: post.cover_image ?? "",
            tagNames: post.tag_names,
          }}
          categories={categoryRows as { id: string; name: string }[]}
        />
      </div>
    </div>
  );
}
