// Admin email outbox (UI-SPEC Page 9) — read-only in Phase 0; the persistence
// contract is proven by the seed-inserted events rendering here.
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function AdminEmailsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/emails");

  const rows = await sql`
    SELECT recipient, subject, status, created_at
    FROM mock_emails ORDER BY created_at DESC`;

  const emails = rows as {
    recipient: string;
    subject: string;
    status: string;
    created_at: string;
  }[];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Email outbox"
        description="Mock emails sent by demo flows"
      />
      {emails.length === 0 ? (
        <div className="rounded-xl border">
          <EmptyState
            icon={<Mail className="h-5 w-5" aria-hidden="true" />}
            title="No mock emails"
            description="Mock emails will appear here when demo flows send them."
          />
        </div>
      ) : (
        <div className="rounded-xl border">
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">To</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Subject</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email, index) => (
                  <tr key={`${email.recipient}-${index}`} className="border-b transition-colors last:border-b-0 hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium">{email.recipient}</td>
                    <td className="px-4 py-3">
                      <span className="block max-w-[280px] truncate text-sm" title={email.subject}>
                        {email.subject}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{email.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {dateFmt.format(new Date(email.created_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
