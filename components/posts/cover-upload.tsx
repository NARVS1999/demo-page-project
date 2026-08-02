"use client";

// Cover upload (client, UI-SPEC Interaction §5): "Upload cover" button +
// visually-hidden file input; client validates image type + size ≤ 3 MB (mirror
// of the route's MAX_BYTES — the UI-SPEC "under 3 MB" amendment); POST
// /api/uploads (FormData field "file") → 201 {url,size} stored in the hidden
// input name="coverImage" (the exact key parsePost reads — 01-01 Task 4).
// Mock-storage URLs render a muted placeholder; failure stays retryable.

import * as React from "react";
import { ImageIcon, ImagePlus, Loader2, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const MAX_BYTES = 3 * 1024 * 1024; // mirrors app/api/uploads/route.ts

export function CoverUpload({ defaultValue }: { defaultValue?: string }) {
  const [url, setUrl] = React.useState<string>(defaultValue ?? "");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draftUrl, setDraftUrl] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isMockUrl = url.startsWith("https://mock.storage/");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("File must be an image under 3 MB.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File must be an image under 3 MB.");
      return;
    }

    setPending(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Cover upload failed. Try again.");
        return;
      }
      const data = (await response.json()) as { url: string };
      setUrl(data.url);
    } catch {
      setError("Cover upload failed. Try again.");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="coverImage" value={url} />

      {url ? (
        <div className="flex flex-col gap-2">
          {isMockUrl ? (
            <div className="flex aspect-[3/2] w-full max-w-xs items-center justify-center gap-2 border border-border bg-muted">
              <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Mock cover — URL only
              </span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Cover preview"
              className="aspect-[3/2] w-full max-w-xs border border-border object-cover"
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() => setUrl("")}
          >
            <X className="mr-1 h-4 w-4" aria-hidden="true" />
            Remove
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="mr-1 h-4 w-4" aria-hidden="true" />
            )}
            {pending ? "Uploading…" : "Upload cover"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Upload cover image"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          <div className="flex w-full max-w-xs flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground" htmlFor="cover-url">
              or paste an image URL
            </Label>
            <div className="flex gap-2">
              <input
                id="cover-url"
                type="url"
                placeholder="https://…/image.jpg"
                value={draftUrl}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Image URL"
                onChange={(event) => setDraftUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    setUrl(draftUrl.trim());
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setUrl(draftUrl.trim())}
              >
                Use
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Uses the image as a real cover — e.g. a picsum, Unsplash, or any hosted image link.
            </p>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
