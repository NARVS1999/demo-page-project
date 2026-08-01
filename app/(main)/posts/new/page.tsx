// New post (UI-SPEC Page 6) — protected, force-dynamic (auth check).
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { PostForm } from "@/components/posts/post-form";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/posts/new");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="New post" />
      <div className="max-w-2xl rounded-xl border p-6">
        <PostForm mode="create" />
      </div>
    </div>
  );
}
