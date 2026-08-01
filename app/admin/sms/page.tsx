// Admin SMS log (UI-SPEC Page 10) — read-only in Phase 0.
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function AdminSmsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/sms");

  const rows = await sql`
    SELECT recipient, message, status, created_at
    FROM mock_sms ORDER BY created_at DESC`;

  const sms = rows as {
    recipient: string;
    message: string;
    status: string;
    created_at: string;
  }[];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="SMS log" description="Mock SMS messages sent by demo flows" />
      {sms.length === 0 ? (
        <div className="rounded-xl border">
          <EmptyState
            icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
            title="No SMS messages"
            description="Mock SMS messages will appear here when demo flows send them."
          />
        </div>
      ) : (
        <div className="rounded-xl border">
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">To</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Message</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {sms.map((row, index) => (
                  <tr key={`${row.recipient}-${index}`} className="border-b transition-colors last:border-b-0 hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium">{row.recipient}</td>
                    <td className="px-4 py-3">
                      <span className="block max-w-[280px] truncate text-sm" title={row.message}>
                        {row.message}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{row.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {dateFmt.format(new Date(row.created_at))}
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
