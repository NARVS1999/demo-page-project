// MOCK: Replace with real Email. Interface must match SendGrid-like
// sendEmail() signature. Persists to mock_emails (viewable in /admin/emails).
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
}: {
  to: string;
  subject: string;
  text: string;
}) {
  assertMockMode();
  const id = randomUUID();
  await sql`INSERT INTO mock_emails (id, recipient, subject, body, status)
    VALUES (${id}, ${to}, ${subject}, ${text}, 'sent')`;
  return { id, status: "sent" as const };
}
