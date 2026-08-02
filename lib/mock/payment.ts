// MOCK: Replace with real Payment. Interface must match Stripe-like
// createPayment() signature. fail:true forces a "failed" status (locked — failed
// events are persisted too so /admin shows real demo data).
// The optional `client` (PoolClient) runs the write INSIDE the caller's
// transaction via pg-style client.query(text, $n) — never the HTTP sql tagged
// template there (RESEARCH Pattern 3 / Pitfall 5). createBooking's deposit path
// and every cancel path use this branch so ROLLBACK undoes the payment row.
import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";

type PoolClient = import("@neondatabase/serverless").PoolClient;

function assertMockMode() {
  if (env.MOCK_PAYMENT === "real") {
    throw new Error("MOCK_PAYMENT=real is not configured in Phase 0 — reserved for future apps.");
  }
}

export async function createPayment(
  {
    amount,
    currency = "usd",
    fail = false,
  }: {
    amount: number;
    currency?: string;
    fail?: boolean;
  },
  client?: PoolClient,
) {
  assertMockMode();
  const id = randomUUID();
  const status = fail ? "failed" : "succeeded";
  if (client) {
    await client.query(
      `INSERT INTO mock_payments (id, amount, currency, status) VALUES ($1, $2, $3, $4)`,
      [id, amount, currency, status],
    );
  } else {
    await sql`INSERT INTO mock_payments (id, amount, currency, status)
      VALUES (${id}, ${amount}, ${currency}, ${status})`;
  }
  return { id, status: status as "succeeded" | "failed", amount, currency };
}

export async function refund(id: string, client?: PoolClient) {
  assertMockMode();
  if (client) {
    await client.query(`UPDATE mock_payments SET status = 'refunded' WHERE id = $1`, [id]);
  } else {
    await sql`UPDATE mock_payments SET status = 'refunded' WHERE id = ${id}`;
  }
  return { id, status: "refunded" as const };
}
