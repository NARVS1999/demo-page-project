// /booking/[id] — shareable booking confirmation (UI-SPEC Page 3): public by
// construction (NOT in the proxy matcher) — guests render the summary and
// notices, the owner gets the cancel action. force-dynamic; isUuid guard →
// notFound() before any SQL (IN-01); Promise.all of the booking row (⋈ slots ⋈
// services ⋈ users ⋈ mock_payments) + notice rows by booking_id (mock_emails,
// mock_sms); any empty → notFound() (unknown id and non-UUID both 404).
// canCancel computed server-side: isOwner && status in (pending, confirmed)
// && slot start in the future (slot_date > toDateKey(now) || same-day
// slot_time > current HH:MM). A cancelled booking still renders (shareable
// history — badge shows cancelled, cancel button hidden).

import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isUuid } from "@/lib/utils";
import { toDateKey } from "@/lib/booking";
import {
  BookingConfirmation,
  type BookingSummary,
  type BookingNotices,
} from "@/components/booking/booking-confirmation";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  if (!isUuid(id)) notFound();

  const [bookingRows, emailRows, smsRows] = await Promise.all([
    sql`
      SELECT b.id, b.status, b.price_cents, b.deposit_payment_id,
             b.created_at, b.user_id,
             s.slot_date::text AS slot_date,
             to_char(s.slot_time, 'HH24:MI') AS slot_time,
             sv.name AS service_name, u.name AS user_name, u.email AS user_email,
             mp.status AS payment_status, mp.amount AS payment_amount
        FROM bookings b
        JOIN slots s ON s.id = b.slot_id
        JOIN services sv ON sv.id = s.service_id
        JOIN users u ON u.id = b.user_id
        LEFT JOIN mock_payments mp ON mp.id = b.deposit_payment_id
       WHERE b.id = ${id}`,
    sql`
      SELECT recipient, subject, body, created_at
        FROM mock_emails WHERE booking_id = ${id} ORDER BY created_at DESC`,
    sql`
      SELECT recipient, message, created_at
        FROM mock_sms WHERE booking_id = ${id} ORDER BY created_at DESC`,
  ]);

  if (bookingRows.length === 0) notFound();
  const row = bookingRows[0];

  const user = await getCurrentUser();
  const isOwner = user?.id === row.user_id;

  // Server-side future check (UI-SPEC Page 3 Data): slot_date > today, or
  // same-day slot_time > current HH:MM — string compare on the same
  // zero-padded key shape as toDateKey.
  const now = new Date();
  const todayKey = toDateKey(now);
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
  const slotDate = row.slot_date as string;
  const slotTime = row.slot_time as string;
  const slotInFuture =
    slotDate > todayKey || (slotDate === todayKey && slotTime > nowHHMM);

  const status = row.status as "pending" | "confirmed" | "cancelled";
  const canCancel =
    isOwner && (status === "pending" || status === "confirmed") && slotInFuture;

  const booking: BookingSummary = {
    id: row.id as string,
    status,
    priceCents: Number(row.price_cents),
    depositPaymentId: (row.deposit_payment_id as string) ?? null,
    paymentAmount: row.payment_amount == null ? null : Number(row.payment_amount),
    slotDate,
    slotTime,
    serviceName: row.service_name as string,
    userEmail: row.user_email as string,
  };

  const notices: BookingNotices = {
    emails: (emailRows as { recipient: string; subject: string; body: string; created_at: Date }[]).map(
      (row) => ({
        recipient: row.recipient,
        subject: row.subject,
        body: row.body,
        createdAt: row.created_at,
      }),
    ),
    sms: (smsRows as { recipient: string; message: string; created_at: Date }[]).map(
      (row) => ({
        recipient: row.recipient,
        message: row.message,
        createdAt: row.created_at,
      }),
    ),
  };

  return (
    <BookingConfirmation
      booking={booking}
      notices={notices}
      isOwner={isOwner}
      canCancel={canCancel}
    />
  );
}
