// Related posts (server): same-category published posts, excluding self,
// newest-first, LIMIT 3 (UI-SPEC Page 2). Renders null when the post is
// uncategorized OR the query returns zero rows — the section is OMITTED when
// empty, never an empty state (UI-SPEC copy contract).

import Link from "next/link";
import { sql } from "@/lib/db";

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export async function RelatedPosts({
  categorySlug,
  currentPostId,
}: {
  categorySlug: string | null;
  currentPostId: string;
}) {
  if (!categorySlug) return null;

  const rows = await sql`
    SELECT p.id, p.title, p.slug, p.cover_image,
           COALESCE(p.published_at, p.created_at) AS published_at
    FROM posts p
    WHERE p.category_id = (SELECT id FROM categories WHERE slug = ${categorySlug})
      AND p.status = 'published' AND p.id <> ${currentPostId}
    ORDER BY p.created_at DESC
    LIMIT 3`;

  if (rows.length === 0) return null;

  return (
    <section className="mt-12 flex flex-col gap-4" aria-label="Related coverage">
      <p className="border-b-2 border-primary font-mono text-xs uppercase tracking-[0.28em] text-primary">
        Related coverage
      </p>
      <div className="h-px w-full bg-muted-foreground/40" />
      <div className="grid gap-6 md:grid-cols-3">
        {rows.map((row) => (
          <article key={row.id} className="flex flex-col gap-2">
            <h3 className="font-serif text-xl font-bold leading-snug tracking-tight">
              <Link href={`/blog/${row.slug}`} className="line-clamp-2 hover:text-primary">
                {row.title}
              </Link>
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {dateFmt.format(new Date(row.published_at))}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
