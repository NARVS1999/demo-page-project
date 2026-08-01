// Posts + taxonomy server actions (UI-SPEC mutations pattern) — "use server".
// Every action re-verifies auth (proxy is a convenience gate only) and scopes
// every SQL write to author_id (IDOR prevention — never trust client-claimed
// ownership).
//
// Deviation note: actions return { ok } instead of calling redirect() so the
// client can show the success toast BEFORE navigating — redirect() throws and
// discards return values, which would lose the UI-SPEC toasts.
//
// Duplicate slugs (posts/categories/tags) surface the UI-SPEC alert copy via
// the 23505 unique-violation catch — never a raw 500 (RESEARCH Pitfall 3).

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { flattenError } from "zod";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isUuid } from "@/lib/utils";
import { slugify } from "@/lib/blog";
import { categorySchema, postSchema, tagSchema } from "@/lib/validate";

type FormState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  ok?: boolean;
};

function parsePost(formData: FormData) {
  return postSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    status: formData.get("status"),
    slug: formData.get("slug"),
    categoryId: formData.get("categoryId"),
    tags: formData.get("tags"),
    coverImage: formData.get("coverImage"),
  });
}

// Delete-and-reinsert the post's tag joins. Non-atomic is accepted (RESEARCH
// Open Question 2 — single-user demo). Tags upsert on slug; joins dedupe.
async function persistTags(postId: string, tags: string[]) {
  await sql`DELETE FROM post_tags WHERE post_id = ${postId}`;
  for (const tag of tags) {
    const tagSlug = slugify(tag);
    if (!tagSlug) continue;
    await sql`INSERT INTO tags (slug, name) VALUES (${tagSlug}, ${tag})
      ON CONFLICT (slug) DO NOTHING`;
    const rows = await sql`SELECT id FROM tags WHERE slug = ${tagSlug}`;
    if (rows.length === 0) continue;
    await sql`INSERT INTO post_tags (post_id, tag_id) VALUES (${postId}, ${rows[0].id})
      ON CONFLICT DO NOTHING`;
  }
}

export async function createPost(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/posts/new");

  const parsed = parsePost(formData);
  if (!parsed.success) {
    return { errors: flattenError(parsed.error).fieldErrors };
  }

  const { title, content, status, slug, categoryId, tags, coverImage } = parsed.data;
  // IN-02: slugify("!!!") → "" — never store an empty slug (unreachable at any
  // /blog URL and it claims the unique '' slot). Fall back to a constant.
  const finalSlug = slug || slugify(title) || "post";
  try {
    const rows = await sql`INSERT INTO posts
      (title, content, status, slug, category_id, cover_image, author_id, published_at)
      VALUES (${title}, ${content}, ${status}, ${finalSlug}, ${categoryId},
        ${coverImage ?? ""}, ${user.id}, ${status === "published" ? new Date() : null})
      RETURNING id`;
    await persistTags(rows[0].id, tags);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { message: "A post with this slug already exists." };
    }
    throw error;
  }

  revalidatePath("/posts");
  return { ok: true };
}

export async function updatePost(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/posts");

  const id = formData.get("id");
  if (typeof id !== "string") return { message: "Missing post id." };
  // Non-UUID ids would throw in Postgres ("invalid input syntax for type uuid")
  // → 500. Treat them like a post that no longer exists (IN-01).
  if (!isUuid(id)) return { message: "This post no longer exists." };

  const parsed = parsePost(formData);
  if (!parsed.success) {
    return { errors: flattenError(parsed.error).fieldErrors };
  }

  const { title, content, status, slug, categoryId, tags, coverImage } = parsed.data;
  // IN-02: slugify("!!!") → "" — never store an empty slug (unreachable at any
  // /blog URL and it claims the unique '' slot). Fall back to a constant.
  const finalSlug = slug || slugify(title) || "post";
  try {
    const rows = await sql`UPDATE posts
      SET title = ${title}, content = ${content}, status = ${status},
          slug = ${finalSlug}, category_id = ${categoryId},
          cover_image = ${coverImage ?? ""},
          published_at = ${status === "published" ? new Date() : null},
          updated_at = now()
      WHERE id = ${id} AND author_id = ${user.id}
      RETURNING id`;
    if (rows.length === 0) {
      return { message: "This post no longer exists." };
    }
    await persistTags(id, tags);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { message: "A post with this slug already exists." };
    }
    throw error;
  }

  revalidatePath("/posts");
  return { ok: true };
}

export async function deletePost(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/posts");

  const id = formData.get("id");
  if (typeof id !== "string") return { message: "Missing post id." };
  // Non-UUID ids would throw in Postgres → 500. Treat them like a post that no
  // longer exists (IN-01).
  if (!isUuid(id)) return { message: "This post no longer exists." };

  const rows = await sql`DELETE FROM posts WHERE id = ${id} AND author_id = ${user.id} RETURNING id`;
  if (rows.length === 0) {
    return { message: "This post no longer exists." };
  }

  revalidatePath("/posts");
  return { ok: true };
}

// ─── Taxonomy actions (RESEARCH Pattern 5) ───────────────────────────────────
// Category delete relies on the FK ON DELETE SET NULL (posts become
// uncategorized automatically — no cleanup SQL); tag delete relies on
// post_tags ON DELETE CASCADE. Every action re-checks auth and catches 23505.

export async function createCategory(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/categories");

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { errors: flattenError(parsed.error).fieldErrors };
  }

  try {
    await sql`INSERT INTO categories (slug, name) VALUES (${parsed.data.slug}, ${parsed.data.name})`;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { message: "A category with this slug already exists." };
    }
    throw error;
  }

  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function renameCategory(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/categories");

  const id = formData.get("id");
  if (typeof id !== "string" || !isUuid(id)) {
    return { message: "This category no longer exists." };
  }

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { errors: flattenError(parsed.error).fieldErrors };
  }

  try {
    const rows = await sql`UPDATE categories
      SET name = ${parsed.data.name}, slug = ${parsed.data.slug}
      WHERE id = ${id}
      RETURNING id`;
    if (rows.length === 0) {
      return { message: "This category no longer exists." };
    }
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { message: "A category with this slug already exists." };
    }
    throw error;
  }

  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function deleteCategory(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/categories");

  const id = formData.get("id");
  if (typeof id !== "string" || !isUuid(id)) {
    return { message: "This category no longer exists." };
  }

  await sql`DELETE FROM categories WHERE id = ${id}`;
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function createTag(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/tags");

  const parsed = tagSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { errors: flattenError(parsed.error).fieldErrors };
  }

  try {
    await sql`INSERT INTO tags (slug, name) VALUES (${parsed.data.slug}, ${parsed.data.name})`;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { message: "A tag with this slug already exists." };
    }
    throw error;
  }

  revalidatePath("/admin/tags");
  return { ok: true };
}

export async function renameTag(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/tags");

  const id = formData.get("id");
  if (typeof id !== "string" || !isUuid(id)) {
    return { message: "This tag no longer exists." };
  }

  const parsed = tagSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { errors: flattenError(parsed.error).fieldErrors };
  }

  try {
    const rows = await sql`UPDATE tags
      SET name = ${parsed.data.name}, slug = ${parsed.data.slug}
      WHERE id = ${id}
      RETURNING id`;
    if (rows.length === 0) {
      return { message: "This tag no longer exists." };
    }
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { message: "A tag with this slug already exists." };
    }
    throw error;
  }

  revalidatePath("/admin/tags");
  return { ok: true };
}

export async function deleteTag(
  _prevState: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/tags");

  const id = formData.get("id");
  if (typeof id !== "string" || !isUuid(id)) {
    return { message: "This tag no longer exists." };
  }

  await sql`DELETE FROM tags WHERE id = ${id}`;
  revalidatePath("/admin/tags");
  return { ok: true };
}
