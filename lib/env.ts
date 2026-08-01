import "server-only";
import { z, flattenError } from "zod";

// ─── Environment schema (TMPL-10) ────────────────────────────────────────────
// Fail-fast at module load: imported by lib/db.ts, lib/session.ts, lib/mock/*.
// Server-only boundary: importing this module from a client component is a
// build error ("server-only"), which guarantees the env parse + process.exit(1)
// can never ship to the browser (CR-01 — lib/validate.ts previously bundled
// this fail-fast block into the login/register client chunk and crashed those
// pages at chunk evaluation time).
// Validates exactly the 9 canonical vars from .env.example.

export const envSchema = z.object({
  DATABASE_URL: z.url(),
  DATABASE_URL_DIRECT: z.url(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  MOCK_PAYMENT: z.enum(["mock", "real"]).default("mock"),
  MOCK_EMAIL: z.enum(["mock", "real"]).default("mock"),
  MOCK_SMS: z.enum(["mock", "real"]).default("mock"),
  MOCK_OAUTH: z.enum(["mock", "real"]).default("mock"),
  MOCK_MAPS: z.enum(["mock", "real"]).default("mock"),
  MOCK_STORAGE: z.enum(["mock", "real"]).default("mock"),
});

export function formatEnvErrors(
  fieldErrors: Record<string, string[] | undefined>,
): string {
  const lines: string[] = [];
  for (const [key, messages] of Object.entries(fieldErrors)) {
    for (const message of messages ?? []) {
      lines.push(`- ${key}: ${message}`);
    }
  }
  return lines.join("\n");
}

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Invalid environment variables:\n" +
      formatEnvErrors(flattenError(parsed.error).fieldErrors),
  );
  process.exit(1);
}

export const env = parsed.data;
