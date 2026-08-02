# Phase 4: Portfolio Shell - Context

**Gathered:** 2026-08-03
**Status:** Ready for planning

<domain>
## Phase Boundary

The front door to the entire showcase — a responsive project grid that aggregates all deployed apps with live links, GitHub links, tech badges, and demo credentials. Replaces the existing landing page at `/` (the `(main)` route group root) since "first thing hiring managers see" means it belongs at root, not a sub-route.

**In scope:**
- Project metadata registry (`lib/projects.ts`)
- Portfolio grid page replacing `app/(main)/page.tsx`
- Project cards with full metadata (name, description, link, GitHub, tech badges, demo creds, mock notes)
- Responsive 2-col → 3-col card grid
- Navigation entry in SiteHeader and MobileNav

**Out of scope:**
- Batch project placeholder cards
- Screenshots or preview images
- Database-driven project list
- Auth gates on portfolio (public page)
</domain>

<decisions>
## Implementation Decisions

### Portfolio Page Layout
- Replace the existing landing page `app/(main)/page.tsx` with the portfolio grid — this is the front door
- Display 4 flagship projects: nextjs-starter (template), CMS, Booking, Ecommerce
- Responsive 2-column (mobile) → 3-column (md+) card grid using Tailwind grid utilities
- Public page — no auth required, lives in `(main)` route group which already serves unauthenticated pages

### Project Card Design
- Full metadata per card: project name, one-line description, live demo link, GitHub repo link, 3-4 tech stack badges, demo credentials inline, and "Uses simulated X" notes as small muted badges
- Tech badges use the shared stack (Next.js, TypeScript, Tailwind, Postgres, shadcn/ui) — all apps share identical stack; per-project variation adds no signal
- Demo credentials displayed directly on the card (email/password visible, no click required)
- Each simulated service (mock payment, mock email, mock SMS) gets a small muted badge tag on the card

### Project Registry & Metadata
- Static TypeScript registry in `lib/projects.ts` — matches existing `lib/site.ts` pattern, type-safe, no DB dependency
- 4 deployed flagships only — only projects with working deployments (success criterion 3 requires no 404s)
- Live URLs hardcoded per project in the registry — each repo has its own Vercel deployment URL

### the agent's Discretion
- Card styling details (borders, shadows, hover states) — follow existing shadcn/ui card patterns
- Exact grid breakpoints and gap sizing
- How to integrate the portfolio into existing nav (replace "Home" link or add "Projects")
- Layout of demo credentials on the card (inline text vs compact row)
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`components/ui/card.tsx`** — shadcn/ui Card, CardHeader, CardContent, CardFooter
- **`components/ui/badge.tsx`** — shadcn/ui Badge with variant prop (default, secondary, outline)
- **`components/ui/page-header.tsx`** — h1 + description + action slot pattern
- **`components/layout/app-shell.tsx`** — SiteHeader + main + SiteFooter wrapper, max-w-5xl
- **`components/layout/site-header.tsx`** — Server component, auth-aware, sticky nav with desktop + mobile
- **`components/layout/mobile-nav.tsx`** — "use client" hamburger Sheet, auth-aware link list
- **`components/layout/site-footer.tsx`** — border-t footer with copyright + GitHub/Home/Login
- **`components/theme-toggle.tsx`** — Sun/Moon/Monitor dropdown
- **`components/theme-provider.tsx`** — next-themes wrapper
- **`components/ui/skeleton.tsx`** — loading skeleton for async boundaries
- **`components/ui/empty-state.tsx`** — empty state pattern
- **`components/ui/error-state.tsx`** — error state pattern
- **`components/ui/button.tsx`** — shadcn button with variant/size/asChild

### Established Patterns
- `export const dynamic = 'force-dynamic'` on every DB-reading page/server component
- Server components for data-reading pages; client components for interactive UI only
- Tailwind responsive utilities: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- `max-w-5xl` content width in AppShell (existing landing respects this)
- `font-mono text-sm font-bold uppercase tracking-[0.18em]` for site name
- `text-muted-foreground` for secondary text, `text-foreground` for primary
- hover transitions: `transition-colors hover:text-foreground`
- border styling: `border-t` on footer, `border-b` on header
- PageHeader for section titles with `description` slot
- lucide-react icons throughout (ExternalLink, Github, Check, etc.)

### Integration Points
- **Landing page**: `app/(main)/page.tsx` — to be replaced with portfolio grid
- **Navigation**: `SiteHeader` and `MobileNav` link arrays — add portfolio entry (or replace Home)
- **Registry**: `lib/projects.ts` — new file, mimics `lib/site.ts` static pattern
- **Route group**: Already in `(main)` — no layout changes needed, inherits AppShell
</code_context>

<specifics>
## Specific Ideas

- Portfolio page should feel like a polished project showcase, not a generic landing — use the card grid from existing product/shop patterns as reference
- All project cards link out to external deployments (target="_blank") and GitHub repos — both are external resources
- Demo credentials are the same across all apps (`demo@example.com` / `demo1234` from seed) — display once or per-card depending on clarity
- Keep the existing `<title>` metadata from layout.tsx — it already reads `SITE.name` which is "nextjs-starter"
</specifics>

<deferred>
## Deferred Ideas

- Batch project placeholder cards (7-27 additional apps) — belongs in a future phase when projects are actually deployed
- Screenshots or live preview iframes — no screenshots exist yet; could be added later
- Filter/search portfolio — small catalog at 4 projects; revisit at 10+
- "Visit all" or guided tour mode — nice-to-have, out of scope for Phase 4
</deferred>
