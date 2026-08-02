# General Mistake Ledger

A ledger of verified mistakes for this template and every app forked from it.

**Purpose:** When an agent finds a non-obvious mistake and verifies its root cause,
record it here so no future agent repeats it. Evidence-first, machine-checkable
entries — each entry carries a grep-able `Signature` that can be swept against
the codebase to catch dormant mistakes before they fail.

## Rules

- **Append only after verification** — the failure must be reproduced (build,
  test, or runtime error) AND the fix confirmed before an entry is added.
- **Search by signature before adding** — no duplicates.
- **Never delete entries** — mark `Status: resolved` (fixed project-wide) or
  `Status: stale` (superseded by dependency/version change).
- **Only non-obvious failures belong here** — duplicating AGENTS.md conventions
  is noise.
- **Provenance** — tag `Found in: <app name>` (this template forks into ~30 apps;
  the ledger travels with each fork).
- **Compaction** — when active entries exceed ~40, run a review to mark
  resolved/stale entries.

## Entry template

```markdown
### NNN — short title
Signature:   (grep pattern that detects the mistake in code)
Symptom:     (what breaks / what the user sees)
Evidence:    (pasted error, failing test, or build output)
Root cause:  (why it happened)
Fix:         (correct pattern to use instead)
Found in:    <app name>
Status:      active | resolved | stale
Date:        YYYY-MM-DD
```

## Entries

### 001 — middleware.ts instead of proxy.ts
Signature:   `middleware.ts` present at repo root (Next 16 app router)
Symptom:     Auth guard silently never runs — protected routes exposed, 401s missing
Evidence:    No middleware execution on any request; Next 16 ignores the old file name
Root cause:  Next 16 renamed the middleware convention to proxy.ts
Fix:         Use root `proxy.ts` exporting `proxy()`. Never add `export const runtime` to it.
Found in:    nextjs-starter
Status:      active
Date:        2026-08-02

### 002 — missing `export const dynamic = 'force-dynamic'` on DB-reading pages
Signature:   DB-reading page/route handler (imports from `lib/db.ts`) without
             `export const dynamic = 'force-dynamic'`
Symptom:     Build fails or renders stale/prerendered data; DB queries at build time
Evidence:    Build-time static prerender of DB queries breaks the build
Root cause:  Next 16 statically prerenders pages without the dynamic escape hatch
Fix:         Add `export const dynamic = 'force-dynamic'` to every DB-reading
             page and route handler
Found in:    nextjs-starter
Status:      active
Date:        2026-08-02

### 003 — missing `import "server-only"` in server libs
Signature:   `lib/db.ts` or `lib/session.ts` without `import "server-only"` as first line
Symptom:     Build error when server code is (accidentally) imported from a client component
Evidence:    Client imports are build errors; bundler pulls server-only code into client bundle
Root cause:  Server modules have no boundary marker, so nothing stops client imports
Fix:         `lib/db.ts`, `lib/session.ts`, `lib/mock/*` must start with
             `import "server-only"`
Found in:    nextjs-starter
Status:      active
Date:        2026-08-02

### 004 — self-referential fake client type annotation
Signature:   `typeof client` in a callback parameter that creates the same `client`
Symptom:     TypeScript reports TS2502 and the test suite cannot type-check.
Evidence:    `TS2502: 'client' is referenced directly or indirectly in its own type annotation.`
Root cause:  A Vitest transaction-double callback used the local fake client's inferred type before that value's declaration had completed.
Fix:         Type the mock callback boundary with an independent client shape (or `unknown`) and pass the fake client as the mock implementation value.
Found in:    nextjs-starter
Status:      active
Date:        2026-08-02
