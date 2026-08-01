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

const MAX_BYTES = 3 * 1024 * 1024; // mirrors app/api/uploads/route.ts

export function CoverUpload({ defaultValue }: { defaultValue?: string }) {
  const [url, setUrl] = React.useState<string>(defaultValue ?? "");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
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
        <div className="flex flex-col gap-2">
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
