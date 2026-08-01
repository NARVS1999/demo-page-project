// Blog card (server): newspaper Features column card (UI-SPEC Page 1).
// Column hairlines come from the parent grid; the card itself renders cover,
// category kicker, serif title, excerpt, and a mono dateline.

import Link from "next/link";
import { CoverImage } from "@/components/blog/cover-image";
import { CategoryBadge } from "@/components/blog/category-badge";

export type BlogPostCard = {
  title: string;
  slug: string;
  excerpt: string;
  category: { name: string; slug: string } | null;
  coverImage: string | null;
  publishedAt: string; // ISO
  authorName: string;
  readingTime: number;
};

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export function BlogCard({ post }: { post: BlogPostCard }) {
  return (
    <article className="flex flex-col">
      <div className="border-b border-border">
        <CoverImage
          src={post.coverImage}
          alt={`Cover for ${post.title}`}
          className="aspect-[3/2] w-full"
        />
      </div>
      <div className="flex flex-col gap-2 pt-4">
        {post.category ? (
          <CategoryBadge name={post.category.name} slug={post.category.slug} />
        ) : null}
        <h3 className="font-serif text-2xl font-bold leading-snug tracking-tight">
          <Link href={`/blog/${post.slug}`} className="line-clamp-2 hover:text-primary">
            {post.title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {dateFmt.format(new Date(post.publishedAt))}
          <span aria-hidden="true"> · </span>
          {post.readingTime} min read
        </p>
      </div>
    </article>
  );
}
