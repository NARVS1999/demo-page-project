// My bookings (protected) — the logged-in user's own bookings with status,
// linked to the shareable confirmation page. force-dynamic per convention.

import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { bookingRef, formatSlotDate, formatSlotTime, formatUsd } from "@/lib/booking";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const statusBadge = {
  confirmed: "default",
  pending: "secondary",
  cancelled: "outline",
} as const;

export default async function MyBookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/bookings");

  const rows = await sql`
    SELECT b.id, b.status, b.price_cents,
           sv.name AS service_name, sv.slug AS service_slug,
           s.slot_date::text AS slot_date, to_char(s.slot_time, 'HH24:MI') AS slot_time,
           mp.status AS payment_status
    FROM bookings b
    JOIN slots s ON s.id = b.slot_id
    JOIN services sv ON sv.id = s.service_id
    LEFT JOIN mock_payments mp ON mp.id = b.deposit_payment_id
    WHERE b.user_id = ${user.id}
    ORDER BY s.slot_date ASC, s.slot_time ASC`;

  const bookings = rows as {
    id: string;
    status: "pending" | "confirmed" | "cancelled";
    price_cents: number;
    service_name: string;
    service_slug: string;
    slot_date: string;
    slot_time: string;
    payment_status: string | null;
  }[];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="My bookings"
        description={`${bookings.length} booking${bookings.length === 1 ? "" : "s"} · soonest first`}
      />

      {bookings.length === 0 ? (
        <div className="rounded-xl border">
          <EmptyState
            icon={<CalendarCheck className="h-5 w-5" aria-hidden="true" />}
            title="No bookings yet"
            description="Book a slot at the barbershop and it will show up here."
            action={
              <Button size="sm" asChild>
                <Link href="/services">Browse services</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="flex flex-col rounded-xl border">
          {bookings.map((booking) => (
            <li key={booking.id} className="border-b last:border-b-0">
              <Link
                href={`/booking/${booking.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="truncate text-sm font-medium">{booking.service_name}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {bookingRef(booking.id)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="hidden font-mono text-sm sm:block">
                    {formatSlotDate(booking.slot_date)} · {formatSlotTime(booking.slot_time)}
                  </span>
                  <span className="hidden font-mono text-sm text-muted-foreground md:block">
                    {formatUsd(booking.price_cents)}
                  </span>
                  <Badge variant={statusBadge[booking.status]}>{booking.status}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" asChild>
          <Link href="/services">Book another</Link>
        </Button>
      </div>
    </div>
  );
}
