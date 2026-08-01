// New post (UI-SPEC Page 6) — protected, force-dynamic (auth check).
// EditorShell replaces PostForm (01-02 Task 3).
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { EditorShell } from "@/components/posts/editor-shell";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/posts/new");

  const categoryRows = await sql`SELECT id, name FROM categories ORDER BY name`;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="New post" />
      <div className="max-w-5xl rounded-xl border p-6">
        <EditorShell mode="create" categories={categoryRows as { id: string; name: string }[]} />
      </div>
    </div>
  );
}
