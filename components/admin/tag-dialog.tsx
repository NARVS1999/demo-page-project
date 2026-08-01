"use client";

// Tag dialog (client, UI-SPEC Page 9): create/rename via server actions
// (01-01 Task 4). Same shape as category-dialog; create toast is "Tag added."
// per the UI-SPEC copy contract.

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/blog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTag, renameTag } from "@/app/(main)/posts/actions";

export function TagDialog({
  mode,
  tag,
  trigger,
}: {
  mode: "create" | "rename";
  tag?: { id: string; name: string; slug: string } | null;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const boundAction = mode === "create" ? createTag : renameTag;
  const [state, formAction, pending] = useActionState(boundAction, null);

  React.useEffect(() => {
    if (!state?.ok) return;
    toast.success(mode === "create" ? "Tag added." : "Tag renamed.");
    // Deferred close keeps the compiler rule happy (no sync setState in
    // effects) while matching the old immediate-close behavior.
    const timer = setTimeout(() => setOpen(false), 0);
    router.refresh();
    return () => clearTimeout(timer);
  }, [state, mode, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New tag" : "Rename tag"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a tag to help readers find related stories."
              : "Update the tag name and slug."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          {mode === "rename" && tag && <input type="hidden" name="id" value={tag.id} />}

          {state?.message && (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="tag-name">Name</Label>
            <Input
              id="tag-name"
              name="name"
              defaultValue={tag?.name ?? ""}
              placeholder="e.g. Next.js"
              aria-invalid={!!state?.errors?.name}
              aria-describedby={state?.errors?.name ? "tag-name-error" : undefined}
            />
            {state?.errors?.name && (
              <p id="tag-name-error" className="text-sm text-destructive">
                {state.errors.name[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tag-slug">Slug</Label>
            <Input
              id="tag-slug"
              name="slug"
              defaultValue={tag?.slug ?? ""}
              placeholder="next-js"
              className="font-mono"
              onBlur={(event) => {
                if (!event.target.value.trim()) {
                  const name = (document.getElementById("tag-name") as HTMLInputElement | null)?.value;
                  if (name) event.target.value = slugify(name);
                }
              }}
              aria-invalid={!!state?.errors?.slug}
              aria-describedby={state?.errors?.slug ? "tag-slug-error" : undefined}
            />
            <p className="text-sm text-muted-foreground">
              Auto-derived from the name — edit to customize.
            </p>
            {state?.errors?.slug && (
              <p id="tag-slug-error" className="text-sm text-destructive">
                {state.errors.slug[0]}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create tag" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
