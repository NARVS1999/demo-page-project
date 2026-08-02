// /admin/bookings — admin booking queue (UI-SPEC Page 4 + Interaction 7/9):
// force-dynamic; protected by proxy + admin layout guard, page re-checks
// getCurrentUser per convention. GET searchParams filters (status/service,
// both default "all", anything else → "all") applied in the SQL WHERE clause
// via conditional fragments; rows sorted soonest-first (ORDER BY slot start
// ASC — the admin's operative queue); twin COUNT(*) for the filtered count
// line. EmptyState variants: no filters → "No bookings yet" (no CTA);
// filters active → "No bookings match these filters." + "Clear filters" CTA.

import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { BookingFilters } from "@/components/admin/booking-filters";
import {
  BookingsTable,
  type BookingRow,
} from "@/components/admin/bookings-table";

export const dynamic = "force-dynamic";

const STATUS_VALUES = new Set(["all", "pending", "confirmed", "cancelled"]);

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; service?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/bookings");

  const params = await searchParams;
  const status = params.status && STATUS_VALUES.has(params.status) ? params.status : "all";

  const services = (await sql`
    SELECT slug, name FROM services ORDER BY created_at ASC`) as {
    slug: string;
    name: string;
  }[];
  const service =
    params.service && services.some((s) => s.slug === params.service)
      ? params.service
      : "all";

  const statusClause = status === "all" ? sql`` : sql`AND b.status = ${status}`;
  const serviceClause = service === "all" ? sql`` : sql`AND sv.slug = ${service}`;

  const [rows, countRows] = await Promise.all([
    sql`
      SELECT b.id, b.status, b.price_cents,
             sv.name AS service_name, sv.slug AS service_slug,
             sv.price_cents AS service_price_cents,
             u.name AS user_name, u.email AS user_email,
             s.slot_date::text AS slot_date,
             to_char(s.slot_time, 'HH24:MI') AS slot_time,
             mp.status AS payment_status
        FROM bookings b
        JOIN slots s ON s.id = b.slot_id
        JOIN services sv ON sv.id = s.service_id
        JOIN users u ON u.id = b.user_id
        LEFT JOIN mock_payments mp ON mp.id = b.deposit_payment_id
       WHERE 1 = 1 ${statusClause} ${serviceClause}
       ORDER BY s.slot_date ASC, s.slot_time ASC`,
    sql`
      SELECT count(*)::int AS count
        FROM bookings b
        JOIN slots s ON s.id = b.slot_id
        JOIN services sv ON sv.id = s.service_id
        JOIN users u ON u.id = b.user_id
        LEFT JOIN mock_payments mp ON mp.id = b.deposit_payment_id
       WHERE 1 = 1 ${statusClause} ${serviceClause}`,
  ]);

  const bookings: BookingRow[] = rows.map((row) => ({
    id: row.id as string,
    status: row.status as "pending" | "confirmed" | "cancelled",
    serviceName: row.service_name as string,
    servicePriceCents: Number(row.service_price_cents),
    userName: row.user_name as string,
    userEmail: row.user_email as string,
    slotDate: row.slot_date as string,
    slotTime: row.slot_time as string,
    paymentStatus: (row.payment_status as string) ?? null,
  }));

  const count = countRows[0].count as number;
  const filtersActive = status !== "all" || service !== "all";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Bookings"
        description={`Manage appointments — ${count} ${
          count === 1 ? "booking" : "bookings"
        } · soonest first.`}
      />
      <div className="rounded-xl border">
        <BookingFilters current={{ status, service }} services={services} />
        {bookings.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={<CalendarCheck className="h-5 w-5" aria-hidden="true" />}
              title="No bookings match these filters."
              description="Adjust the filters, or clear them."
              action={
                <Button asChild variant="outline">
                  <Link href="/admin/bookings">Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<CalendarCheck className="h-5 w-5" aria-hidden="true" />}
              title="No bookings yet"
              description="Bookings will appear here when customers reserve slots."
            />
          )
        ) : (
          <BookingsTable rows={bookings} current={{ status, service }} />
        )}
      </div>
    </div>
  );
}
