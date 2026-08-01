// lib/blog.ts — client-safe pure helpers (NO "server-only" — imported by the
// browser editor-shell for slugify/parseTags, by public pages for
// readingTime/excerpt, and by /blog/search for escapeLike).
// All five helpers are pure and side-effect free (TDD target).

/** Lowercase slug: non-alphanumeric runs → "-", trimmed, collapsed. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Neutralize ILIKE wildcards (% _ \) — ILIKE's default escape char is backslash. */
export function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, "\\$&");
}

/** Reading time in minutes, floored at 1, at 200 words per minute. */
export function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Plain-text excerpt: strips markdown tokens, collapses whitespace, clamps 160 + "…". */
export function excerpt(content: string, max = 160): string {
  const plain = content
    .replace(/[#>*`_~[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
}

/** Split a raw tag input on comma/fullwidth-comma/newline; trim, dedupe (case-insensitive), cap. */
export function parseTags(input: string, max = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(/[,，\n]/)) {
    const tag = raw.trim();
    if (tag.length === 0) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= max) break;
  }
  return out;
}
