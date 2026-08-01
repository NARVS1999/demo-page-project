import { z } from "zod";
import { parseTags } from "@/lib/blog";

// ─── Input schemas (TMPL-09; UI-SPEC copy contract) ──────────────────────────
// Client-safe on purpose (CR-01): NO env parsing, NO process.exit, NO module
// side effects — the login/register pages bundle this module into the browser.
// Environment validation lives in lib/env.ts (server-only, fail-fast at load).

// Shared slug contract (REFACTOR — categorySchema/tagSchema/postSchema.slug):
// lowercase letters/numbers separated by single hyphens. Empty string is a
// valid submission (means "auto-derive") and is preprocessed to undefined so
// the slugify(title) fallback in the actions stays reachable.
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
  // "" → undefined → actions fall back to slugify(title)
  slug: z
    .preprocess((v) => (v === "" ? undefined : v), z.string().regex(slugRegex, "Use lowercase letters, numbers, and hyphens.").optional()),
  // Editor submits "" for "No category" → null
  categoryId: z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable().optional()),
  // Comma-joined string from tags-input → array (deduped, capped at 8)
  tags: z.preprocess((v) => parseTags(String(v ?? "")), z.array(z.string().min(1)).max(8)).default([]),
  coverImage: z.union([z.string().url("Enter a valid URL."), z.literal("")]).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  slug: z.string().regex(slugRegex, "Use lowercase letters, numbers, and hyphens."),
});

export const tagSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  slug: z.string().regex(slugRegex, "Use lowercase letters, numbers, and hyphens."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type TagInput = z.infer<typeof tagSchema>;
