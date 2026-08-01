// Posts server actions (UI-SPEC mutations pattern) — "use server".
// Every action re-verifies auth (proxy is a convenience gate only) and scopes
// every SQL write to author_id (IDOR prevention — never trust client-claimed
// ownership).
//
// Deviation note: actions return { ok } instead of calling redirect() so the
// client can show the success toast BEFORE navigating — redirect() throws and
// discards return values, which would lose the UI-SPEC toasts.

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { flattenError } from "zod";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isUuid } from "@/lib/utils";
import { postSchema } from "@/lib/validate";

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
  });
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

  const { title, content, status } = parsed.data;
  await sql`INSERT INTO posts (title, content, status, author_id)
    VALUES (${title}, ${content}, ${status}, ${user.id})`;

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

  const { title, content, status } = parsed.data;
  const rows = await sql`UPDATE posts
    SET title = ${title}, content = ${content}, status = ${status}, updated_at = now()
    WHERE id = ${id} AND author_id = ${user.id}
    RETURNING id`;
  if (rows.length === 0) {
    return { message: "This post no longer exists." };
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
