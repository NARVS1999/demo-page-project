// /blog/[slug] — published article page (UI-SPEC Page 2).
// Unknown AND draft slugs return the identical 404 (WHERE status = 'published'
// — no enumeration, RESEARCH Pitfall 4). Serif reading column, drop cap via
// .article-body, kicker + tag chips, byline dateline, cover, related coverage.

import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { readingTime } from "@/lib/blog";
import { MarkdownContent } from "@/components/blog/markdown-content";
import { CoverImage } from "@/components/blog/cover-image";
import { CategoryBadge } from "@/components/blog/category-badge";
import { TagChip } from "@/components/blog/tag-chip";
import { RelatedPosts } from "@/components/blog/related-posts";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const rows = await sql`
    SELECT p.id, p.title, p.slug, p.cover_image, p.content,
           COALESCE(p.published_at, p.created_at) AS published_at,
           u.name AS author_name,
           c.slug AS category_slug, c.name AS category_name,
           COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tag_names,
           COALESCE(array_agg(t.slug) FILTER (WHERE t.slug IS NOT NULL), '{}') AS tag_slugs
    FROM posts p
    JOIN users u ON u.id = p.author_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN post_tags pt ON pt.post_id = p.id
    LEFT JOIN tags t ON t.id = pt.tag_id
    WHERE p.slug = ${slug} AND p.status = 'published'
    GROUP BY p.id, u.name, c.slug, c.name`;

  if (rows.length === 0) notFound();
  const post = rows[0];

  const tagNames = (post.tag_names as string[]) ?? [];
  const tagSlugs = (post.tag_slugs as string[]) ?? [];

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {post.category_slug ? (
            <CategoryBadge name={post.category_name} slug={post.category_slug} />
          ) : null}
          {tagNames.map((name, i) => (
            <TagChip key={tagSlugs[i] ?? name} name={name} slug={tagSlugs[i] ?? ""} />
          ))}
        </div>
        <h1 className="max-w-3xl font-serif text-4xl font-bold tracking-tight sm:text-5xl">
          {post.title}
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {post.author_name}
          <span aria-hidden="true"> · </span>
          {dateFmt.format(new Date(post.published_at))}
          <span aria-hidden="true"> · </span>
          {readingTime(post.content)} min read
        </p>
      </div>

      <div className="max-w-3xl">
        <CoverImage
          src={post.cover_image}
          alt={`Cover for ${post.title}`}
          className="aspect-[3/2] w-full border border-border"
        />
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <MarkdownContent content={post.content} />
      </div>

      <RelatedPosts categorySlug={post.category_slug ?? null} currentPostId={post.id} />
    </article>
  );
}
