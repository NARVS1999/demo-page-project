"use client";

// Posts table (client): Title (truncate), Status badge, Author, Created, and a
// row Actions dropdown (Edit / Delete with alert-dialog confirm). Skeleton row
// variant for loading. Delete submits the server action, blocks while pending,
// and toasts "Post deleted." on success.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ellipsis, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeletePostDialog } from "@/components/posts/delete-post-dialog";

export type PostRow = {
  id: string;
  title: string;
  status: string;
  authorName: string;
  createdAt: string; // ISO — formatted client-side per RESEARCH don't-hand-roll
  categoryName: string | null;
  tagNames: string[];
};

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export function PostsTable({
  posts,
  showEmptyAction = false,
}: {
  posts: PostRow[];
  showEmptyAction?: boolean;
}) {
  const router = useRouter();

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <span className="text-muted-foreground">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-semibold tracking-tight">No posts yet</h3>
          <p className="text-base text-muted-foreground">
            Create your first post to see it here.
          </p>
        </div>
        {showEmptyAction && (
          <Button asChild>
            <Link href="/posts/new">
              <Plus className="mr-2 h-4 w-4" />
              New post
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[640px] w-full">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Title</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Category</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tags</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Author</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id} className="border-b transition-colors hover:bg-muted/50">
              <td className="px-4 py-3">
                <Link
                  href={`/posts/${post.id}/edit`}
                  className="block max-w-[280px] truncate text-sm font-medium hover:text-foreground/80"
                  title={post.title}
                >
                  {post.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Badge variant={post.status === "published" ? "default" : "secondary"}>
                  {post.status === "published" ? "Published" : "Draft"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {post.categoryName ?? <span className="text-muted-foreground/60">—</span>}
              </td>
              <td className="px-4 py-3">
                {post.tagNames.length > 0 ? (
                  <div className="flex max-w-[220px] items-center gap-1 overflow-hidden">
                    {post.tagNames.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="rounded-none">
                        {tag}
                      </Badge>
                    ))}
                    {post.tagNames.length > 2 && (
                      <span className="truncate text-sm text-muted-foreground">
                        +{post.tagNames.length - 2}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground/60">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {post.authorName}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {dateFmt.format(new Date(post.createdAt))}
              </td>
              <td className="px-4 py-3 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${post.title}`}>
                      <Ellipsis className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onSelect={() => router.push(`/posts/${post.id}/edit`)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DeletePostDialog
                      postId={post.id}
                      postTitle={post.title}
                    >
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={(event) => event.preventDefault()}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DeletePostDialog>
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

export function PostsTableSkeleton() {
  return (
    <div className="flex flex-col" aria-label="Loading posts">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex h-12 items-center gap-4 border-b px-4">
          <div className="h-4 w-1/3 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
          <div className="ml-auto h-4 w-24 animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}
