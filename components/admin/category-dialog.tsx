"use client";

// Category dialog (client, UI-SPEC Page 8): create/rename via server actions
// (01-01 Task 4). Slug auto-derives from the name on blur via slugify;
// inline errors from action state; blocking pending spinner; success toast +
// close + router.refresh(); duplicate slug → destructive Alert (23505 copy).

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
import { createCategory, renameCategory } from "@/app/(main)/posts/actions";

export function CategoryDialog({
  mode,
  category,
  trigger,
}: {
  mode: "create" | "rename";
  category?: { id: string; name: string; slug: string } | null;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const boundAction = mode === "create" ? createCategory : renameCategory;
  const [state, formAction, pending] = useActionState(boundAction, null);

  React.useEffect(() => {
    if (!state?.ok) return;
    toast.success(mode === "create" ? "Category created." : "Category renamed.");
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
          <DialogTitle>{mode === "create" ? "New category" : "Rename category"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a category to organize the blog."
              : "Update the category name and slug."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          {mode === "rename" && category && (
            <input type="hidden" name="id" value={category.id} />
          )}

          {state?.message && (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              name="name"
              defaultValue={category?.name ?? ""}
              placeholder="e.g. Design"
              aria-invalid={!!state?.errors?.name}
              aria-describedby={state?.errors?.name ? "category-name-error" : undefined}
            />
            {state?.errors?.name && (
              <p id="category-name-error" className="text-sm text-destructive">
                {state.errors.name[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="category-slug">Slug</Label>
            <Input
              id="category-slug"
              name="slug"
              defaultValue={category?.slug ?? ""}
              placeholder="design"
              className="font-mono"
              onBlur={(event) => {
                if (!event.target.value.trim()) {
                  const name = (
                    document.getElementById("category-name") as HTMLInputElement | null
                  )?.value;
                  if (name) event.target.value = slugify(name);
                }
              }}
              aria-invalid={!!state?.errors?.slug}
              aria-describedby={state?.errors?.slug ? "category-slug-error" : undefined}
            />
            <p className="text-sm text-muted-foreground">
              Auto-derived from the name — edit to customize.
            </p>
            {state?.errors?.slug && (
              <p id="category-slug-error" className="text-sm text-destructive">
                {state.errors.slug[0]}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create category" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
