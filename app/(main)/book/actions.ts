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

      // 3. Deposit INSIDE the txn (BOOK-08) — 25%, server-computed; ROLLBACK
      //    removes the payment row with everything else (no orphan payment).
      let depositPaymentId: string | null = null;
      if (deposit) {
        const pay = await payment.createPayment(
          { amount: Math.round(priceCents * 0.25), currency: "usd" },
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
