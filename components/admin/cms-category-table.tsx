"use client";

// Categories table (client, UI-SPEC Page 8): Name (with post-count suffix),
// Slug, Created, Actions (Rename → category-dialog, Delete → alert-dialog
// with the UI-SPEC uncategorization copy). Row hover, skeleton variant,
// empty state with CTA. Delete binds deleteCategory → toast + refresh.

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis, FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryDialog } from "@/components/admin/category-dialog";
import { deleteCategory } from "@/app/(main)/posts/actions";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: string; // ISO
  postCount: number;
};

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export function CmsCategoryTable({
  categories,
  loading = false,
}: {
  categories: CategoryRow[];
  loading?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(deleteCategory, null);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Category deleted.");
      router.refresh();
    }
  }, [state, router]);

  if (loading) {
    return (
      <div className="flex flex-col" aria-label="Loading categories">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex h-12 items-center gap-4 border-b px-4">
            <div className="h-4 w-1/3 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
            <div className="ml-auto h-4 w-8 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-5 w-5" aria-hidden="true" />}
        title="No categories yet"
        description="Create a category to organize the blog."
        action={
          <CategoryDialog
            mode="create"
            trigger={
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                New category
              </Button>
            }
          />
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[560px] w-full">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Slug</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr
              key={category.id}
              className="border-b transition-colors last:border-b-0 hover:bg-muted/50"
            >
              <td className="px-4 py-3">
                <span className="block max-w-[240px] truncate text-sm font-medium">
                  {category.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {category.postCount} {category.postCount === 1 ? "post" : "posts"}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="block max-w-[200px] truncate font-mono text-sm text-muted-foreground">
                  {category.slug}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {dateFmt.format(new Date(category.createdAt))}
              </td>
              <td className="px-4 py-3 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${category.name}`}>
                      <Ellipsis className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <CategoryDialog
                      mode="rename"
                      category={category}
                      trigger={
                        <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                          Rename
                        </DropdownMenuItem>
                      }
                    />
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={(event) => event.preventDefault()}
                        >
                          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete category?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Posts in this category will become uncategorized. This action cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <form action={formAction}>
                            <input type="hidden" name="id" value={category.id} />
                            <AlertDialogAction
                              type="submit"
                              disabled={pending}
                              className="bg-destructive text-white hover:bg-destructive/90"
                            >
                              {pending ? "Deleting…" : "Delete"}
                            </AlertDialogAction>
                          </form>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
