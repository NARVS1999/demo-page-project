"use client";

// Post form (client): useActionState bound to createPost/updatePost.
// Create mode: empty form, submit "Create post". Edit mode: prefilled from the
// server page, submit "Save changes". Errors surface as destructive Alert.
// Success → toast + client navigation (see actions.ts deviation note).

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPost, updatePost } from "@/app/(main)/posts/actions";
import type { PostInput } from "@/lib/validate";

export function PostForm({
  mode,
  post,
}: {
  mode: "create" | "edit";
  post?: PostInput & { id: string };
}) {
  const router = useRouter();
  const isEdit = mode === "edit";

  // The post id travels as a hidden input inside the form — no bind needed;
  // useActionState supplies prevState as the first action argument.
  const boundAction = isEdit ? updatePost : createPost;

  const [state, formAction, pending] = useActionState(boundAction, null);

  // Success → toast + navigate (server action returns instead of redirect).
  React.useEffect(() => {
    if (state?.ok) {
      toast.success(isEdit ? "Post updated." : "Post created.");
      router.push("/posts");
      router.refresh();
    }
  }, [state, isEdit, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {isEdit && post && <input type="hidden" name="id" value={post.id} />}

      {state?.message && (
        <Alert variant="destructive">
          <AlertDescription>
            {state.message}
            {state.message === "This post no longer exists." && (
              <>{" "}
                <a href="/posts" className="font-medium underline underline-offset-4">
                  Back to posts
                </a>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          defaultValue={post?.title ?? ""}
          placeholder="A clear, specific title"
          aria-invalid={!!state?.errors?.title}
          aria-describedby={state?.errors?.title ? "title-error" : undefined}
        />
        {state?.errors?.title && (
          <p id="title-error" className="text-sm text-destructive">
            {state.errors.title[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          name="content"
          rows={10}
          defaultValue={post?.content ?? ""}
          placeholder="Write your post…"
          className="font-mono text-sm"
          aria-invalid={!!state?.errors?.content}
          aria-describedby={state?.errors?.content ? "content-error" : undefined}
        />
        {state?.errors?.content && (
          <p id="content-error" className="text-sm text-destructive">
            {state.errors.content[0]}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="published"
          name="published"
          type="checkbox"
          defaultChecked={post?.published ?? false}
          className="size-4 accent-primary"
        />
        <Label htmlFor="published" className="font-medium">
          Published
        </Label>
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {pending ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save changes" : "Create post"}
      </Button>
    </form>
  );
}
