"use client";

// Markdown preview (client): live editor preview rendered through the SAME
// shared pipeline as the article (markdown-components map + .article-body) so
// the two can never drift (RESEARCH Pattern 4 / Pitfall 5).
// NOT aria-live (per-keystroke SR spam — UI-SPEC a11y §2); the rendered tree
// is memoized.

import * as React from "react";
import Markdown from "react-markdown";
import {
  markdownComponents,
  remarkPlugins,
} from "@/components/posts/markdown-components";

export function MarkdownPreview({ markdown }: { markdown: string }) {
  // Memoize the rendered tree: cheap for < 50 KB and avoids re-render work on
  // every keystroke (UI-SPEC Component Inventory).
  const tree = React.useMemo(
    () => (
      <Markdown remarkPlugins={remarkPlugins} components={markdownComponents}>
        {markdown}
      </Markdown>
    ),
    [markdown],
  );

  return (
    <div
      className="flex min-h-[320px] flex-col bg-card border border-border lg:h-[65vh]"
      aria-label="Markdown preview"
    >
      <div className="flex flex-col">
        <p className="px-4 pt-3 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          Preview
        </p>
        <div className="mt-2 h-px w-full bg-muted-foreground/40" />
      </div>
      <div className="article-body overflow-y-auto p-4">{tree}</div>
    </div>
  );
}
