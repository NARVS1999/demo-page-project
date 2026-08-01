# Phase 1: CMS App - Context

**Gathered:** 2026-08-02
**Status:** Ready for planning

<domain>
## Phase Boundary

First flagship project validating the template with a real domain: a working blog/CMS with post CRUD, markdown editor with live preview, categories and tags, draft/publish workflow, search (ILIKE), public-facing blog pages, and an admin dashboard for content management. Builds on the Phase 0 template (nature newspaper theme, auth, raw SQL, mock services). Public blog pages are accessible without login; admin/CRUD requires authentication.

</domain>

<decisions>
## Implementation Decisions

### CMS Schema & Data Model
- Single `categories` table (slug + name) — posts link via FK
- `tags` + `post_tags` join table — many-to-many, filterable
- `status` enum on posts (draft/published) — reuses existing posts table
- Raw markdown stored in `content` TEXT column, rendered server-side

### CMS Features & Content
- Textarea + live preview split (client component, react-markdown) — zero heavy deps
- Image upload via mock storage service → returns URL, stored in post `cover_image` (uses existing lib/mock)
- Search via ILIKE on title + content + category + tags — one search endpoint
- 5 realistic demo posts (template guide, mock services, deployment walkthrough, theme, CRUD tutorial) — never Lorem ipsum

### CMS UI & Public Pages
- Public blog styled as newspaper "Features" columns — matches chosen nature theme
- Routes: `/blog`, `/blog/[slug]`, `/blog/category/[slug]`, `/blog/tag/[slug]` — clean URLs, all public
- Reading experience: serif body (Newsreader), drop cap, category/tag links, related posts by category
- Admin: reuse existing `/admin` shell — Posts list gains category/tag management section

### the agent's Discretion
- Exact column counts, sidebar composition, and component structure details
- Seed post cover image choices and copy specifics beyond the 5 titles
- How search results page presents (reuse /blog list or dedicated result list)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Template auth: jose JWT httpOnly cookie, `lib/session.ts` getCurrentUser, proxy guard for /admin and /api/*
- Posts CRUD reference: existing posts table (author_id ownership, isUuid guards), server actions with {ok} returns + toasts, form patterns
- Mock services: lib/mock/* — payment, email, SMS, OAuth, maps, storage (storage service for image uploads)
- UI: shadcn/ui components (alert-dialog, badge, card, dialog, dropdown-menu, form, select, table, textarea, empty-state, error-state, page-header, stat-card), AppShell + AdminShell layouts, newspaper nature theme (Newsreader serif, washi/moss tokens, sharp corners)
- Seed: scripts/seed.ts with migration ledger, ON CONFLICT upserts, size report < 200 MB gate

### Established Patterns
- Raw SQL via @neondatabase/serverless (neon() tagged templates + Pool for transactions)
- `export const dynamic = 'force-dynamic'` on every DB-reading page/route
- Zod 4 validation (lib/validate.ts schemas, flattenError), bcryptjs only in handlers
- lib/env.ts server-only env validation, lib/db.ts typed helpers
- Posts ownership-scoped SQL (WHERE author_id), generic 401/404 anti-enumeration
- Migration files in db/migrations/, applied by seed

### Integration Points
- Phase 0 posts table may need migration for category_id FK + cover_image + status additions (or new CMS tables alongside)
- Admin shell: add CMS management section (categories/tags)
- AppShell (main) group: public blog pages under /blog routes
- Seed script: extend with 5 demo posts, categories, tags
- lib/mock/storage for image upload endpoint

</code_context>

<specifics>
## Specific Ideas

- No specific references beyond accepted tables — standard approaches per discussion

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>
