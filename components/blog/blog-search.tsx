"use client";

// Blog search (client): plain GET form → /blog/search (server-rendered
// results — no client fetch, no debounce per UI-SPEC §5). Submits on Enter or
// the search-icon button. Full width on mobile, w-64 on desktop.

import { Search } from "lucide-react";

export function BlogSearch({ defaultValue }: { defaultValue?: string }) {
  return (
    <form method="GET" action="/blog/search" className="w-full sm:w-64" role="search">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search className="h-4 w-4" aria-hidden="true" />
        </span>
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          maxLength={100}
          aria-label="Search the blog"
          placeholder="Search the blog…"
          className="w-full rounded-none border-b-2 border-border bg-transparent py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>
    </form>
  );
}
