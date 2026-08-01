// Dashboard (UI-SPEC Page 4) — protected, force-dynamic, counts via SQL.
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Mail, MessageSquare } from "lucide-react";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const [postCountRows, emailCountRows, smsCountRows, recentRows] = await Promise.all([
    sql`SELECT count(*)::int AS count FROM posts WHERE author_id = ${user.id}`,
    sql`SELECT count(*)::int AS count FROM mock_emails`,
    sql`SELECT count(*)::int AS count FROM mock_sms`,
    sql`SELECT id, title, created_at FROM posts
        WHERE author_id = ${user.id}
        ORDER BY created_at DESC LIMIT 5`,
  ]);

  const postCount = postCountRows[0].count as number;
  const emailCount = emailCountRows[0].count as number;
  const smsCount = smsCountRows[0].count as number;
  const recent = recentRows as { id: string; title: string; created_at: string }[];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard" description={`Welcome back, ${user.name}`} />

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard label="Total posts" value={postCount} icon={<FileText className="h-5 w-5" aria-hidden="true" />} />
        <StatCard label="Mock emails" value={emailCount} icon={<Mail className="h-5 w-5" aria-hidden="true" />} />
        <StatCard label="Mock SMS" value={smsCount} icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />} />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Recent posts</h2>
        {recent.length === 0 ? (
          <div className="rounded-xl border">
            <EmptyState
              icon={<FileText className="h-5 w-5" aria-hidden="true" />}
              title="No posts yet"
              description="Create your first post to see it here."
              action={
                <Button asChild>
                  <Link href="/posts/new">New post</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="flex flex-col rounded-xl border">
            {recent.map((post) => (
              <li key={post.id} className="border-b last:border-b-0">
                <Link
                  href={`/posts/${post.id}/edit`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <span className="truncate text-sm font-medium">{post.title}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {dateFmt.format(new Date(post.created_at))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" asChild>
          <Link href="/posts">Posts</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/admin">Admin</Link>
        </Button>
      </div>
    </div>
  );
}
