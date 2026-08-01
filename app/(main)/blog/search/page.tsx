// /blog/search — server-rendered ILIKE results page (UI-SPEC Page 5,
// RESEARCH Pattern 3 — a PAGE, not a route handler). Empty/whitespace queries
// and queries over 100 chars redirect to /blog (Pitfall 6). escapeLike keeps
// % and _ literal. DISTINCT dedupes posts matching multiple tags.

import { redirect } from "next/navigation";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { sql } from "@/lib/db";
import { escapeLike, excerpt, readingTime } from "@/lib/blog";
import { BlogCard, type BlogPostCard } from "@/components/blog/blog-card";
import { BlogSearch } from "@/components/blog/blog-search";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function BlogSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  if (!q || q.length > 100) redirect("/blog");

  const pattern = `%${escapeLike(q)}%`;
  const rows = await sql`
    SELECT DISTINCT p.id, p.title, p.slug, p.cover_image,
           p.content, COALESCE(p.published_at, p.created_at) AS published_at,
           u.name AS author_name,
           c.slug AS category_slug, c.name AS category_name,
           COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tag_names,
           COALESCE(array_agg(t.slug) FILTER (WHERE t.slug IS NOT NULL), '{}') AS tag_slugs
    FROM posts p
    JOIN users u ON u.id = p.author_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN post_tags pt ON pt.post_id = p.id
    LEFT JOIN tags t ON t.id = pt.tag_id
    WHERE p.status = 'published'
      AND (p.title ILIKE ${pattern} OR p.content ILIKE ${pattern}
           OR c.name ILIKE ${pattern} OR t.name ILIKE ${pattern})
    GROUP BY p.id, u.name, c.slug, c.name
    ORDER BY COALESCE(p.published_at, p.created_at) DESC`;

  const posts: BlogPostCard[] = rows.map((row) => ({
    title: row.title,
    slug: row.slug,
    excerpt: excerpt(row.content),
    category: row.category_slug ? { name: row.category_name, slug: row.category_slug } : null,
    coverImage: row.cover_image,
    publishedAt: row.published_at,
    authorName: row.author_name,
    readingTime: readingTime(row.content),
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="border-b-2 border-primary font-mono text-xs uppercase tracking-[0.28em] text-primary">
            The Blog
          </p>
          <div className="h-px w-full bg-muted-foreground/40" />
          <h1 className="font-serif text-4xl font-bold tracking-tight">Search results</h1>
          <p className="font-mono text-sm text-muted-foreground">
            {posts.length} {posts.length === 1 ? "result" : "results"} for &quot;{q}&quot;
          </p>
        </div>
        <div className="shrink-0">
          <BlogSearch defaultValue={q} />
        </div>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-5 w-5" aria-hidden="true" />}
          title={`No results for "${q}"`}
          description="Try different keywords, or browse all stories."
          action={
            <Button asChild>
              <Link href="/blog">Browse all stories</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <div
              key={post.slug}
              className={
                "flex flex-col" +
                (i > 0 ? " md:border-l md:border-muted-foreground/40 md:pl-6" : "") +
                (i >= 3 ? " md:border-t md:pt-6" : "")
              }
            >
              <BlogCard post={post} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
