// Booking server actions (UI-SPEC mutations pattern) — "use server".
// createBooking runs the CONTEXT-locked atomic claim INSIDE withPool:
//   SELECT slot+price → conditional UPDATE slots (rowCount 0 = just taken) →
//   in-transaction deposit (payment.createPayment with the PoolClient) →
//   INSERT bookings RETURNING id → COMMIT → post-commit email/SMS notices.
// All SQL inside withPool is pg-style client.query(text, $n) — the neon sql
// tagged template is HTTP-only and must never join a transaction (Pitfall 5).
// cancelBooking (Task 3) shares this file's FormState + auth skeleton.

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { flattenError } from "zod";
import { withPool } from "@/lib/db";
import { email, payment, sms } from "@/lib/mock";
import { getCurrentUser } from "@/lib/session";
import { isUuid } from "@/lib/utils";
import { bookingSchema } from "@/lib/validate";
import { depositCents } from "@/lib/booking";

type FormState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  ok?: boolean;
  bookingId?: string;
};

// Claim failure (unknown slot / just taken) — maps to the UI-SPEC conflict
// copy, never a 500 (RESEARCH Pitfall 4).
class BookingConflictError extends Error {}

export async function createBooking(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/book");

  const parsed = bookingSchema.safeParse({
    slotId: formData.get("slotId"),
    deposit: formData.get("deposit"),
  });
  if (!parsed.success) {
    return { errors: flattenError(parsed.error).fieldErrors };
  }
  const { slotId, deposit } = parsed.data;

  try {
    const booked = await withPool(async (client) => {
      // 1. Slot + service snapshot (unknown slot → conflict, never a 500)
      const slot = await client.query(
        `SELECT s.service_id, sv.name AS service_name,
                s.slot_date::text AS slot_date,
                to_char(s.slot_time, 'HH24:MI') AS slot_time,
                sv.price_cents
           FROM slots s JOIN services sv ON sv.id = s.service_id
          WHERE s.id = $1`,
        [slotId],
      );
      if (slot.rowCount === 0) throw new BookingConflictError();
      const priceCents = Number(slot.rows[0].price_cents);
      const serviceName = slot.rows[0].service_name as string;
      const slotDate = slot.rows[0].slot_date as string;
      const slotTime = slot.rows[0].slot_time as string;

      // 2. Locked atomic claim (BOOK-04) — one statement, no lock round-trip
      const claim = await client.query(
        `UPDATE slots SET booked_at = now()
          WHERE id = $1 AND booked_at IS NULL`,
        [slotId],
      );
      if (claim.rowCount === 0) throw new BookingConflictError();

      // 3. Deposit INSIDE the txn (BOOK-08) — 25% (depositCents is the single
      //    source of truth for the formula); ROLLBACK removes the payment row
      //    with everything else (no orphan payment, no claimed-without-deposit).
      let depositPaymentId: string | null = null;
      if (deposit) {
        const pay = await payment.createPayment(
          { amount: depositCents(priceCents), currency: "usd" },
          client,
        );
        depositPaymentId = pay.id;
      }

      // 4. Booking row (snapshot price; status pending per UI-SPEC)
      const ins = await client.query(
        `INSERT INTO bookings (slot_id, user_id, status, price_cents, deposit_payment_id)
         VALUES ($1, $2, 'pending', $3, $4) RETURNING id`,
        [slotId, user.id, priceCents, depositPaymentId],
      );
      return {
        id: ins.rows[0].id as string,
        serviceName,
        slotDate,
        slotTime,
      };
    });

    // COMMIT done — notices after the txn (mock mode never fails; the booking
    // is the atomic unit, a notice is a log row — BOOK-06/07).
    await email.sendEmail({
      to: user.email,
      subject: "Booking confirmation",
      text: `Your ${booked.serviceName} booking is confirmed for ${booked.slotDate} at ${booked.slotTime}.`,
      bookingId: booked.id,
    });
    await sms.sendSms({
      to: "+15551234567",
      message: `Reminder: your ${booked.serviceName} booking at ${booked.slotDate} ${booked.slotTime}. Reply STOP to opt out.`,
      bookingId: booked.id,
    });

    revalidatePath("/book");
    return { ok: true, bookingId: booked.id };
  } catch (error) {
    if (error instanceof BookingConflictError) {
      return { message: "That slot was just taken." }; // UI-SPEC conflict copy
    }
    if ((error as { code?: string }).code === "23505") {
      return { message: "That slot was just taken." }; // partial-index fallback
    }
    throw error;
  }
}

// User cancel (BOOK-05): owner-scoped (WHERE b.user_id) + "upcoming" guard
// (slot still in the future) — the ONLY differences from cancelBookingAdmin.
// Race-safe reopen (Pitfall 7): the slot's claim is cleared only when NO OTHER
// active booking exists on it, so a concurrent fresh claim is never wiped.
// Refund runs inside the same transaction via the mock's client branch.
export async function cancelBooking(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/book");

  const id = formData.get("bookingId");
  if (typeof id !== "string" || !isUuid(id)) {
    return { message: "This booking no longer exists." }; // generic, anti-enumeration
  }

  const outcome = await withPool(async (client) => {
    const rows = await client.query(
      `UPDATE bookings b SET status = 'cancelled', updated_at = now()
         FROM slots s
        WHERE b.id = $1 AND b.slot_id = s.id
          AND b.status IN ('pending', 'confirmed')
          AND b.user_id = $2
          AND (s.slot_date > CURRENT_DATE
               OR (s.slot_date = CURRENT_DATE AND s.slot_time > CURRENT_TIME))
        RETURNING b.slot_id, b.deposit_payment_id`,
      [id, user.id],
    );
    if (rows.rowCount === 0) return { ok: false as const };

    const { slot_id, deposit_payment_id } = rows.rows[0];
    // Reopen, race-safe: only clear the claim if no OTHER active booking
    // (status <> 'cancelled', id <> the one being cancelled) holds the slot.
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
  revalidatePath("/book");
  return { ok: true };
}
