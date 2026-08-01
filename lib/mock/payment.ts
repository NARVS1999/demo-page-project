// MOCK: Replace with real Payment. Interface must match Stripe-like
// createPayment() signature. fail:true forces a "failed" status (locked — failed
// events are persisted too so /admin shows real demo data).
import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { env } from "@/lib/validate";

function assertMockMode() {
  if (env.MOCK_PAYMENT === "real") {
    throw new Error("MOCK_PAYMENT=real is not configured in Phase 0 — reserved for future apps.");
  }
}

export async function createPayment({
  amount,
  currency = "usd",
  fail = false,
}: {
  amount: number;
  currency?: string;
  fail?: boolean;
}) {
  assertMockMode();
  const id = randomUUID();
  const status = fail ? "failed" : "succeeded";
  await sql`INSERT INTO mock_payments (id, amount, currency, status)
    VALUES (${id}, ${amount}, ${currency}, ${status})`;
  return { id, status: status as "succeeded" | "failed", amount, currency };
}

export async function refund(id: string) {
  assertMockMode();
  await sql`UPDATE mock_payments SET status = 'refunded' WHERE id = ${id}`;
  return { id, status: "refunded" as const };
}
