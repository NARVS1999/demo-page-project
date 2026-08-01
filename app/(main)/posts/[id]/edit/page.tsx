// Edit post (UI-SPEC Page 7) — protected, force-dynamic.
// Ownership enforced on READ too: a post that isn't the current user's → 404.
import { notFound, redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isUuid } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { PostForm } from "@/components/posts/post-form";

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

  const rows = await sql`SELECT id, title, content, status
    FROM posts WHERE id = ${id} AND author_id = ${user.id}`;
  if (rows.length === 0) notFound();
  const post = rows[0] as {
    id: string;
    title: string;
    content: string;
    status: "draft" | "published";
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Edit post" />
      <div className="max-w-2xl rounded-xl border p-6">
        <PostForm mode="edit" post={{ id: post.id, title: post.title, content: post.content, status: post.status, tags: [] }} />
      </div>
    </div>
  );
}
