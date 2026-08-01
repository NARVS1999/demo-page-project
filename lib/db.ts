// lib/db.ts — server-only data layer (TMPL-03)
// Importing this module from a client component is a build error ("server-only").
// Template-wide rules:
//   - neon() HTTP (stateless) is safe at module scope in serverless.
//   - Pool/Client must be created, used, and closed within a single request
//     handler — never at module scope (serverless rule).
//   - Node 24 global WebSocket: neonConfig.webSocketConstructor is NOT needed.

import "server-only";
import { neon } from "@neondatabase/serverless";

/** One-shot queries over HTTP (pooled connection). Module-safe. */
export const sql = neon(process.env.DATABASE_URL!);

/** Migrations/seed only — direct connection (no -pooler). Never for app reads. */
export const sqlDirect = neon(process.env.DATABASE_URL_DIRECT!);

/**
 * Interactive transaction (BEGIN/COMMIT/ROLLBACK) over a per-request WebSocket
 * Pool. The Pool is created and closed inside the call — serverless-safe.
 */
export async function withPool<T>(
  fn: (client: import("@neondatabase/serverless").PoolClient) => Promise<T>,
): Promise<T> {
  const { Pool } = await import("@neondatabase/serverless");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
