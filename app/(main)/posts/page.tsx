// Posts list (UI-SPEC Page 5) — protected, force-dynamic, JOIN users for author.
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PostsTable } from "@/components/posts/posts-table";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/posts");

  // Public list: published posts from everyone + the current user's own drafts.
  // Other users' unpublished drafts stay invisible (IN-03) — drafts are only
  // visible to their owner here and in /admin.
  const rows = await sql`
    SELECT posts.id, posts.title, posts.status, posts.created_at, users.name AS author_name
    FROM posts JOIN users ON users.id = posts.author_id
    WHERE posts.status = 'published' OR posts.author_id = ${user.id}
    ORDER BY posts.created_at DESC`;

  const posts = (rows as {
    id: string;
    title: string;
    status: string;
    created_at: string;
    author_name: string;
  }[]).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    authorName: row.author_name,
  }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Posts"
        description="Reference CRUD implementation"
        action={
          <Button asChild>
            <Link href="/posts/new">
              <Plus className="mr-2 h-4 w-4" />
              New post
            </Link>
          </Button>
        }
      />
      <div className="rounded-xl border">
        <PostsTable posts={posts} showEmptyAction />
      </div>
    </div>
  );
}
