// /book — single-page booking flow (UI-SPEC Page 2): public availability,
// login required only at slot selection (Interaction 5). force-dynamic;
// searchParams-as-Promise reads ?service={slug} for preselect — an invalid
// slug is treated as unselected (no redirect). Availability = LEFT JOIN
// bookings WHERE status <> 'cancelled' over the rolling CURRENT_DATE..+13
// window (Interaction 10 — cancelled bookings never block), grouped
// server-side into days[] with zero-slot days omitted (documented exception).

import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { toDateKey } from "@/lib/booking";
import { BookingFlow } from "@/components/booking/booking-flow";
import {
  type ServiceCardData,
} from "@/components/booking/service-card";
import { type SlotDay } from "@/components/booking/slot-picker";

export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service } = await searchParams;
  const user = await getCurrentUser();

  const serviceRows = await sql`
    SELECT id, slug, name, description, price_cents, duration_min
    FROM services ORDER BY created_at ASC`;

  const services: ServiceCardData[] = serviceRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceCents: Number(row.price_cents),
    durationMin: Number(row.duration_min),
  }));

  const selected = services.find((s) => s.slug === service) ?? null;

  let days: SlotDay[] = [];
  if (selected) {
    const rows = await sql`
      SELECT s.id, to_char(s.slot_time, 'HH24:MI') AS slot_time,
             s.slot_date::text AS slot_date, (b.id IS NOT NULL) AS taken
        FROM slots s
        LEFT JOIN bookings b ON b.slot_id = s.id AND b.status <> 'cancelled'
       WHERE s.service_id = ${selected.id}
         AND s.slot_date >= CURRENT_DATE AND s.slot_date <= CURRENT_DATE + 13
         AND (s.slot_date > CURRENT_DATE
              OR (s.slot_date = CURRENT_DATE AND s.slot_time > CURRENT_TIME))
       ORDER BY s.slot_date, s.slot_time`;

    const byDate = new Map<string, SlotDay>();
    for (const row of rows) {
      const date = row.slot_date as string;
      let day = byDate.get(date);
      if (!day) {
        day = { date, isToday: date === toDateKey(new Date()), slots: [] };
        byDate.set(date, day);
      }
      day.slots.push({ id: row.id, time: row.slot_time, taken: row.taken });
    }
    days = [...byDate.values()];
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="border-b-2 border-primary font-mono text-xs uppercase tracking-[0.28em] text-primary">
          Booking
        </p>
        <div className="h-px w-full bg-muted-foreground/40" />
        <h1 className="font-serif text-4xl font-bold tracking-tight">Book a slot</h1>
        <p className="text-base text-muted-foreground">
          Pick a service, choose a day, grab a time.
        </p>
      </div>

      <BookingFlow
        services={services}
        selectedServiceSlug={selected?.slug ?? null}
        days={days}
        guest={!user}
      />
    </div>
  );
}
