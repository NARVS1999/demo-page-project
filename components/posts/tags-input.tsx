"use client";

// Tags input (client): chips row + text input (UI-SPEC Interaction §7).
// Enter or comma adds (trim, case-insensitive dedupe, max 8); Backspace on an
// empty input removes the last chip; Enter never submits the form
// (keydown preventDefault). Serialized into a hidden input name="tags" as a
// comma-joined string — the exact key parsePost reads (01-01 Task 4).

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function TagsInput({
  defaultValue = [],
  error,
}: {
  defaultValue?: string[];
  error?: string;
}) {
  const [tags, setTags] = React.useState<string[]>(defaultValue);
  const [text, setText] = React.useState("");
  const [localError, setLocalError] = React.useState<string | null>(null);

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    const key = tag.toLowerCase();
    setTags((prev) => {
      if (prev.some((t) => t.toLowerCase() === key)) return prev;
      if (prev.length >= 8) {
        setLocalError("Add up to 8 tags.");
        return prev;
      }
      setLocalError(null);
      return [...prev, tag];
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(text);
      setText("");
    } else if (event.key === "Backspace" && !text && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const removeTag = (name: string) => {
    setTags((prev) => prev.filter((t) => t !== name));
  };

  const errorMessage = error ?? localError;

  return (
    <div className="flex flex-col gap-2">
      <input
        type="hidden"
        name="tags"
        value={tags.join(",")}
        aria-invalid={!!errorMessage}
        aria-describedby={errorMessage ? "tags-error" : undefined}
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <input
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (text) {
            addTag(text);
            setText("");
          }
        }}
        placeholder="Press Enter or comma to add a tag."
        aria-label="Add a tag"
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {errorMessage && (
        <p id="tags-error" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
