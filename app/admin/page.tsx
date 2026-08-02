// Admin overview (UI-SPEC Page 8) — force-dynamic, seed-visible mock activity.
import { redirect } from "next/navigation";
import { CalendarClock, FileText, FolderOpen, Hash, Inbox, Mail, MessageSquare } from "lucide-react";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

type ActivityRow = {
  kind: "email" | "sms";
  to: string;
  status: string;
  created_at: string;
};

export default async function AdminOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");

  const [postRows, emailRows, smsRows, categoryRows, tagRows, bookingRows, emailActivity, smsActivity] =
    await Promise.all([
      sql`SELECT count(*)::int AS count FROM posts`,
      sql`SELECT count(*)::int AS count FROM mock_emails`,
      sql`SELECT count(*)::int AS count FROM mock_sms`,
      sql`SELECT count(*)::int AS count FROM categories`,
      sql`SELECT count(*)::int AS count FROM tags`,
      sql`SELECT count(*)::int AS count FROM bookings`,
      sql`SELECT recipient, status, created_at FROM mock_emails ORDER BY created_at DESC LIMIT 5`,
      sql`SELECT recipient, status, created_at FROM mock_sms ORDER BY created_at DESC LIMIT 5`,
    ]);

  const activity: ActivityRow[] = [
    ...(emailActivity as Omit<ActivityRow, "kind">[]).map((row) => ({ ...row, kind: "email" as const })),
    ...(smsActivity as Omit<ActivityRow, "kind">[]).map((row) => ({ ...row, kind: "sms" as const })),
  ]
    // neon returns timestamptz as a JS Date — compare via getTime().
    .sort((a, b) => (b.created_at as unknown as Date).getTime() - (a.created_at as unknown as Date).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Overview" description="Platform status" />

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard label="Total posts" value={postRows[0].count as number} icon={<FileText className="h-5 w-5" aria-hidden="true" />} />
        <StatCard label="Categories" value={categoryRows[0].count as number} icon={<FolderOpen className="h-5 w-5" aria-hidden="true" />} />
        <StatCard label="Tags" value={tagRows[0].count as number} icon={<Hash className="h-5 w-5" aria-hidden="true" />} />
        <StatCard label="Mock emails" value={emailRows[0].count as number} icon={<Mail className="h-5 w-5" aria-hidden="true" />} />
        <StatCard label="Mock SMS" value={smsRows[0].count as number} icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />} />
        <StatCard label="Bookings" value={bookingRows[0].count as number} icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />} />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Recent mock activity</h2>
        {activity.length === 0 ? (
          <div className="rounded-xl border">
            <EmptyState
              icon={<Inbox className="h-5 w-5" aria-hidden="true" />}
              title="No activity yet"
              description="Mock email and SMS events will appear here when demo flows send them."
            />
          </div>
        ) : (
          <ul className="flex flex-col rounded-xl border">
            {activity.map((row, index) => (
              <li
                key={`${row.kind}-${index}`}
                className="flex items-center justify-between gap-4 border-b px-4 py-3 last:border-b-0"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="text-muted-foreground">
                    {row.kind === "email" ? (
                      <Mail className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  <span className="truncate text-sm font-medium">{row.to}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <Badge variant="secondary">{row.status}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {dateFmt.format(new Date(row.created_at))}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
