// MOCK: Replace with real SMS. Interface must match Twilio-like sendSms()
// signature. Persists to mock_sms (viewable in /admin/sms).
import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";

function assertMockMode() {
  if (env.MOCK_SMS === "real") {
    throw new Error("MOCK_SMS=real is not configured in Phase 0 — reserved for future apps.");
  }
}

export async function sendSms({ to, message }: { to: string; message: string }) {
  assertMockMode();
  const id = randomUUID();
  await sql`INSERT INTO mock_sms (id, recipient, message, status)
    VALUES (${id}, ${to}, ${message}, 'delivered')`;
  return { id, status: "delivered" as const };
}
