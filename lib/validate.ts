import { z } from "zod";

// ─── Input schemas (TMPL-09; UI-SPEC copy contract) ──────────────────────────
// Client-safe on purpose (CR-01): NO env parsing, NO process.exit, NO module
// side effects — the login/register pages bundle this module into the browser.
// Environment validation lives in lib/env.ts (server-only, fail-fast at load).

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
  status: z.enum(["draft", "published"]).default("draft"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PostInput = z.infer<typeof postSchema>;
