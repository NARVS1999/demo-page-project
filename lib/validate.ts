import { z } from "zod";

// ─── Environment schema (TMPL-10) ────────────────────────────────────────────
// Fail-fast at module load: imported by lib/db.ts, lib/session.ts, lib/mock/*.
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
      formatEnvErrors(parsed.error.flatten().fieldErrors),
  );
  process.exit(1);
}

export const env = parsed.data;

// ─── Input schemas (TMPL-09; UI-SPEC copy contract) ──────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters."),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters."),
});

export const postSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(200),
  content: z.string().min(1, "Content is required."),
  published: z.boolean().default(false),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PostInput = z.infer<typeof postSchema>;
