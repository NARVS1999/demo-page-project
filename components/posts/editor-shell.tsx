"use client";

// Editor shell (client, UI-SPEC Pages 6/7): the full markdown editor that
// superseded the old posts form. Hidden fields carry the non-native inputs: status (segmented
// control), categoryId (select), tags (tags-input), coverImage (cover-upload,
// name="coverImage" — MUST equal parsePost's formData.get("coverImage") key
// from 01-01 Task 4; the action maps it to the cover_image column).
//
// useActionState → blocking submit (pending disables + Loader2); inline field
// errors via state.errors; destructive Alert for server messages; success →
// toast keyed off the submitted status + router.push("/posts") + refresh.
// No autosave, no dirty flags, no beforeunload (UI-SPEC Interaction §2).

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/blog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPost, updatePost } from "@/app/(main)/posts/actions";
import { MarkdownPreview } from "@/components/posts/markdown-preview";
import { TagsInput } from "@/components/posts/tags-input";
import { CoverUpload } from "@/components/posts/cover-upload";

export type EditorPost = {
  id: string;
  title: string;
  content: string;
  status: string;
  slug: string;
  categoryId: string | null;
  coverImage: string;
  tagNames: string[];
};

export function EditorShell({
  mode,
  post,
  categories,
}: {
  mode: "create" | "edit";
  post?: EditorPost | null;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [title, setTitle] = React.useState(post?.title ?? "");
  const [content, setContent] = React.useState(post?.content ?? "");
  const [slug, setSlug] = React.useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = React.useState(Boolean(post?.slug));
  const [status, setStatus] = React.useState<string>(post?.status ?? "draft");
  const [submittedStatus, setSubmittedStatus] = React.useState<string>("draft");

  const boundAction = isEdit ? updatePost : createPost;
  const [state, formAction, pending] = useActionState(boundAction, null);

  React.useEffect(() => {
    if (!state?.ok) return;
    const submitted = submittedStatus;
    if (isEdit) {
      toast.success(submitted === "published" ? "Post updated." : "Draft saved.");
    } else {
      toast.success(submitted === "published" ? "Post published." : "Draft saved.");
    }
    router.push("/posts");
    router.refresh();
  }, [state, isEdit, router, submittedStatus]);

  // Submit buttons carry the final status (Save draft vs Publish): set both
  // the segmented control and the submitted-status record on click. React 19
  // flushes discrete-event state synchronously, so the hidden status input
  // carries the button's value into FormData — independent of any prior
  // segment selection (the button is the commitment).
  const submitAs = (value: string) => () => {
    setStatus(value);
    setSubmittedStatus(value);
  };

  const deriveSlugFromTitle = () => {
    if (!slugTouched) setSlug(slugify(title));
  };

  const moveStatus = (delta: number) => {
    setStatus((prev) => {
      const values = ["draft", "published"];
      const idx = values.indexOf(prev);
      const next = values[idx + delta];
      return next ?? prev;
    });
  };

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {isEdit && post && <input type="hidden" name="id" value={post.id} />}
      <input type="hidden" name="status" value={status} readOnly />

      {state?.message && (
        <Alert variant="destructive">
          <AlertDescription>
            {state.message}
            {state.message === "This post no longer exists." && (
              <>
                {" "}
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
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={deriveSlugFromTitle}
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
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          placeholder="auto-generated"
          className="max-w-sm font-mono"
          aria-invalid={!!state?.errors?.slug}
          aria-describedby={state?.errors?.slug ? "slug-error" : undefined}
        />
        <p className="text-sm text-muted-foreground">
          Auto-generated from the title — edit to customize.
        </p>
        {state?.errors?.slug && (
          <p id="slug-error" className="text-sm text-destructive">
            {state.errors.slug[0]}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="categoryId">Category</Label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={post?.categoryId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted-foreground">
            Used for the blog kicker and related posts.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Tags</Label>
          <TagsInput defaultValue={post?.tagNames ?? []} error={state?.errors?.tags?.[0]} />
          <p className="text-sm text-muted-foreground">Press Enter or comma to add a tag.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Cover image</Label>
        <CoverUpload defaultValue={post?.coverImage ?? ""} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Status</Label>
        <div
          role="radiogroup"
          aria-label="Status"
          className="flex w-fit gap-1 bg-muted p-1"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              moveStatus(-1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              moveStatus(1);
            }
          }}
        >
          {(["draft", "published"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={status === value}
              onClick={() => setStatus(value)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium transition-colors",
                status === value
                  ? "bg-background border border-border shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {value === "draft" ? "Draft" : "Published"}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Drafts are visible only to you.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="content">Content</Label>
        <div className="grid gap-6 lg:grid-cols-2">
          <Textarea
            id="content"
            name="content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write in markdown…"
            className="min-h-[320px] font-mono text-sm lg:h-[65vh]"
            aria-invalid={!!state?.errors?.content}
            aria-describedby={state?.errors?.content ? "content-error" : undefined}
          />
          <MarkdownPreview markdown={content} />
        </div>
        {state?.errors?.content && (
          <p id="content-error" className="text-sm text-destructive">
            {state.errors.content[0]}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-4">
        <Button type="submit" variant="secondary" disabled={pending} onClick={submitAs("draft")}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save draft
        </Button>
        <Button
          type="submit"
          disabled={pending}
          onClick={submitAs("published")}
        >
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit && status === "published" ? "Save changes" : "Publish"}
        </Button>
      </div>
    </form>
  );
}
