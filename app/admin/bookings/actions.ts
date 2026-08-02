// Admin booking actions (confirm/cancel) — "use server" (BOOK-05).
// confirmBooking: pending → confirmed inside withPool, then a post-COMMIT
// notice email carrying booking_id (BOOK-06 — the booking is the atomic unit;
// a notice is a log row and mock mode never fails).
// cancelBookingAdmin: the shared cancel transaction WITHOUT the owner WHERE
// and WITHOUT the upcoming guard (admin cancels any pending/confirmed booking,
// past or future) — race-safe reopen + in-txn refund (RESEARCH Pattern 2).
// All SQL inside withPool is pg-style client.query(text, $n) — never the
// HTTP sql tagged template inside a transaction (Pitfall 5).

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql, withPool } from "@/lib/db";
import { email, payment } from "@/lib/mock";
import { getCurrentUser } from "@/lib/session";
import { isUuid } from "@/lib/utils";

type FormState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  ok?: boolean;
};

export async function confirmBooking(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/bookings");

  const id = formData.get("bookingId");
  if (typeof id !== "string" || !isUuid(id)) {
    return { message: "This booking no longer exists." }; // generic, anti-enumeration
  }

  const confirmed = await withPool(async (client) => {
    const rows = await client.query(
      `UPDATE bookings b SET status = 'confirmed', updated_at = now()
         FROM slots s JOIN services sv ON sv.id = s.service_id
        WHERE b.id = $1 AND b.slot_id = s.id AND b.status = 'pending'
        RETURNING b.user_id, sv.name AS service_name,
                  s.slot_date::text AS slot_date,
                  to_char(s.slot_time, 'HH24:MI') AS slot_time`,
      [id],
    );
    if (rows.rowCount === 0) return null;
    return {
      userId: rows.rows[0].user_id as string,
      serviceName: rows.rows[0].service_name as string,
      slotDate: rows.rows[0].slot_date as string,
      slotTime: rows.rows[0].slot_time as string,
    };
  });

  if (!confirmed) return { message: "This booking no longer exists." };

  // Post-COMMIT: notice email (module-level sql is fine after the txn).
  const users = await sql`SELECT email FROM users WHERE id = ${confirmed.userId}`;
  if (users.length > 0) {
    await email.sendEmail({
      to: users[0].email,
      subject: "Booking confirmed",
      text: `Your ${confirmed.serviceName} booking at ${confirmed.slotDate} ${confirmed.slotTime} is confirmed.`,
      bookingId: id,
    });
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/book");
  return { ok: true };
}

export async function cancelBookingAdmin(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/bookings");

  const id = formData.get("bookingId");
  if (typeof id !== "string" || !isUuid(id)) {
    return { message: "This booking no longer exists." }; // generic, anti-enumeration
  }

  const outcome = await withPool(async (client) => {
    // No owner WHERE, no upcoming guard — admin cancels any active booking.
    const rows = await client.query(
      `UPDATE bookings b SET status = 'cancelled', updated_at = now()
         FROM slots s
        WHERE b.id = $1 AND b.slot_id = s.id
          AND b.status IN ('pending', 'confirmed')
        RETURNING b.slot_id, b.deposit_payment_id`,
      [id],
    );
    if (rows.rowCount === 0) return { ok: false as const };

    const { slot_id, deposit_payment_id } = rows.rows[0];
    // Race-safe reopen (Pitfall 7): never clear a claim that now belongs to
    // ANOTHER (concurrent, fresh) booking.
    await client.query(
      `UPDATE slots SET booked_at = NULL
        WHERE id = $1 AND booked_at IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM bookings
             WHERE slot_id = $1 AND status <> 'cancelled' AND id <> $2
          )`,
      [slot_id, id],
    );
    if (deposit_payment_id) await payment.refund(deposit_payment_id, client);

    return { ok: true as const };
  });

  if (!outcome.ok) return { message: "This booking no longer exists." };
  revalidatePath("/admin/bookings");
  revalidatePath("/book");
  return { ok: true };
}
