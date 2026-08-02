// MOCK: Replace with real Email. Interface must match SendGrid-like
// sendEmail() signature. Persists to mock_emails (viewable in /admin/emails).
// Optional `bookingId` links the notice to a booking (BOOK-06) — the nullable
// booking_id column was added by 003_booking.sql; existing call sites omit it.
import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";

function assertMockMode() {
  if (env.MOCK_EMAIL === "real") {
    throw new Error("MOCK_EMAIL=real is not configured in Phase 0 — reserved for future apps.");
  }
}

export async function sendEmail({
  to,
  subject,
  text,
  bookingId,
}: {
  to: string;
  subject: string;
  text: string;
  bookingId?: string;
}) {
  assertMockMode();
  const id = randomUUID();
  await sql`INSERT INTO mock_emails (id, recipient, subject, body, status, booking_id)
    VALUES (${id}, ${to}, ${subject}, ${text}, 'sent', ${bookingId ?? null})`;
  return { id, status: "sent" as const };
}
