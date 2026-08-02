import "server-only";

// MOCK: Replace with real SMS. Interface must match Twilio-like sendSms()
// signature. Persists to mock_sms (viewable in /admin/sms).
// Optional `bookingId` links the notice to a booking (BOOK-07) — the nullable
// booking_id column was added by 003_booking.sql; existing call sites omit it.
import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";

function assertMockMode() {
  if (env.MOCK_SMS === "real") {
    throw new Error("MOCK_SMS=real is not configured in Phase 0 — reserved for future apps.");
  }
}

export async function sendSms({
  to,
  message,
  bookingId,
}: {
  to: string;
  message: string;
  bookingId?: string;
}) {
  assertMockMode();
  const id = randomUUID();
  await sql`INSERT INTO mock_sms (id, recipient, message, status, booking_id)
    VALUES (${id}, ${to}, ${message}, 'delivered', ${bookingId ?? null})`;
  return { id, status: "delivered" as const };
}
