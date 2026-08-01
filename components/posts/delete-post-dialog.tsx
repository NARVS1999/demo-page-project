"use client";

// Delete-post confirm dialog (client). Radix AlertDialogAction auto-closes on
// click, unmounting the portal content before the browser can process an
// implicit form submission ("form submission canceled because the form is not
// connected"). Fix: intercept the click (preventDefault), requestSubmit() the
// form while the dialog is still mounted, and close the dialog only after the
// delete action reports success. Owns its own useActionState per row.

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deletePost } from "@/app/(main)/posts/actions";

export function DeletePostDialog({
  postId,
  postTitle,
  children,
}: {
  postId: string;
  postTitle: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(deletePost, null);
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Post deleted.");
      const timer = setTimeout(() => setOpen(false), 0);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete post?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &ldquo;{postTitle}&rdquo;. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state?.message && (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <form
            ref={formRef}
            action={formAction}
            className="inline-flex"
            aria-label="Delete post"
          >
            <input type="hidden" name="id" value={postId} />
            <AlertDialogAction
              type="submit"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                formRef.current?.requestSubmit();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
