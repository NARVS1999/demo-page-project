# Phase 1: CMS App - Research

**Researched:** 2026-08-02
**Domain:** Blog/CMS on Next.js 16 App Router + Neon Postgres (extends Phase 0 template)
**Confidence:** HIGH

## Summary

Phase 1 extends the working Phase 0 template (posts CRUD with `published` boolean, mock storage service, admin shell, newspaper theme) into a full CMS: categories/tags taxonomy, draft/publish workflow, markdown editor with live preview, mock-storage cover uploads, ILIKE search, and public `/blog` pages. The extension is additive — the existing posts table gets new columns via an idempotent `002_cms.sql` migration, and the public routes slot into the existing `(main)` AppShell route group with **zero proxy.ts changes** (the matcher only covers `/api`, `/admin`, `/dashboard`, `/posts`; `/blog` is not matched, so it is public by construction).

Two dependencies are new: `react-markdown@10.1.0` + `remark-gfm@4.0.1` (both verified OK on the registry, no postinstall scripts, React 19 compatible). Everything else reuses existing template machinery: server actions with `{ok}` returns, `useActionState` forms, Zod 4 schemas in `lib/validate.ts`, `force-dynamic` DB pages, neon tagged-template SQL, and the mock storage service.

**Primary recommendation:** One migration file `db/migrations/002_cms.sql` (ledger-guarded, idempotent) that adds `status` (replacing `published`), `slug`, `category_id`, `cover_image`, `published_at` to `posts` and creates `categories`/`tags`/`post_tags`; then update every `published` touchpoint (seed, actions, posts list page, edit page, posts-table, post-form→editor-shell); then build public `/blog` pages and admin category/tag pages on top. Extract pure helpers (slugify, escapeLike, parseTags, readingTime, excerpt) into a new client-safe `lib/blog.ts` so the editor, queries, and unit tests share one implementation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- CMS Schema & Data Model: single `categories` table (slug + name), posts FK; `tags` + `post_tags` join table (many-to-many, filterable); `status` enum on posts (draft/published) reusing the existing posts table; raw markdown stored in `content` TEXT, rendered server-side.
- CMS Features & Content: textarea + live preview split (client component, react-markdown) — zero heavy deps; image upload via mock storage service → returns URL, stored in post `cover_image` (uses existing lib/mock); search via ILIKE on title + content + category + tags — one search endpoint; 5 realistic demo posts (template guide, mock services, deployment walkthrough, theme, CRUD tutorial) — never Lorem ipsum.
- CMS UI & Public Pages: public blog styled as newspaper "Features" columns; routes `/blog`, `/blog/[slug]`, `/blog/category/[slug]`, `/blog/tag/[slug]` — clean URLs, all public; reading experience: serif body (Newsreader), drop cap, category/tag links, related posts by category; admin reuses existing `/admin` shell — Posts list gains category/tag management section.

### the agent's Discretion
- Exact column counts, sidebar composition, and component structure details
- Seed post cover image choices and copy specifics beyond the 5 titles
- How search results page presents (reuse /blog list or dedicated result list) — resolved by UI-SPEC: dedicated result page

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope

### Locked UI-SPEC Constraints (01-UI-SPEC.md)
- New npm deps: `react-markdown` + `remark-gfm` only; no shadcn registry additions; no token overrides; no `@tailwindcss/typography` plugin (token-based article styles)
- react-markdown escapes raw HTML by default — content renders as rendered-markdown only, never raw HTML; seed content must not rely on raw HTML
- Mock storage uploads: `POST /api/uploads` (FormData field `file`) → 201 `{ url, size }`; client validates image/* ≤ 4 MB; honest-mock behavior (mock URLs never resolve; seed covers use `https://picsum.photos/seed/{slug}/800/533`)
- Public pages select `published` posts only (status = published); drafts owner-visible only, never on public routes (404)
- `export const dynamic = "force-dynamic"` on all DB-reading pages (AGENTS.md hard convention)
- Editor: no autosave; blocking mutations via `useActionState`; status = segmented Draft/Published control; slug auto-derived on blur
- Header nav gains "Blog" (→ `/blog`) visible to guests AND authenticated users; admin sidebar gains "Content" group (Categories `/admin/categories`, Tags `/admin/tags`)

### Project Constraints (from AGENTS.md)
- `proxy.ts`, not `middleware.ts`; never add `export const runtime` to proxy.ts
- `export const dynamic = 'force-dynamic'` on every DB-reading page/route handler
- Dual Neon URLs — pooled for app, direct for migrations/seed
- Server-only boundaries: `lib/db.ts`, `lib/session.ts`, `lib/mock/*` start with `import "server-only"`; client imports are build errors
- bcryptjs only in route handlers / seed
- Raw SQL only — neon tagged templates, never string-concatenated input
- Migrations: idempotent `db/migrations/*.sql` applied by `npm run seed` with `schema_migrations` ledger; upserts via `ON CONFLICT`; seed reports size and exits non-zero at ≥ 200 MB
- No ORM, no Prisma, no `ws` package (Node 24 global WebSocket)
- Env contract: 9 vars (both DATABASE_URLs, SESSION_SECRET ≥ 32 chars, 6 `MOCK_*` switches); no new env vars needed for Phase 1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CMS-01 | Admin CRUD for posts with markdown editor | `editor-shell` replaces `post-form` (UI-SPEC); extended `postSchema` + actions in `app/(main)/posts/actions.ts`; react-markdown live preview (verified §Standard Stack); migration adds slug/status/category/cover columns |
| CMS-02 | Draft/publish workflow | `status` text+CHECK column replaces `published` boolean (migration §Pattern 1); public queries `WHERE status = 'published'`; drafts 404 publicly; `published_at` set on publish |
| CMS-03 | Category and tag management | New `categories`/`tags`/`post_tags` tables (§Pattern 1); `/admin/categories` + `/admin/tags` pages under existing AdminShell; FK SET NULL/CASCADE semantics; dialogs per UI-SPEC copy contract |
| CMS-04 | Image upload via mock storage | `POST /api/uploads` route handler reusing `storage.upload({ name, data })` (verified signature in `lib/mock/storage.ts`); proxy gates `/api/*`; Vercel 4.5 MB body limit → 3 MB client cap (§Pitfall 3) |
| CMS-05 | Search posts via ILIKE | `/blog/search` page (not route handler) with `searchParams`; parameterized ILIKE across title/content/category/tag names with `escapeLike` (§Pattern 3) |
| CMS-06 | Public blog list page | `/blog` under `(main)` AppShell; proxy matcher excludes `/blog` → public by construction (§Pattern 2); Features grid per UI-SPEC Page 1 |
| CMS-07 | Public single post page | `/blog/[slug]`; slug-based lookup, `notFound()` for unknown/draft slugs (never leaks); markdown-content server render; related posts by category |
| CMS-08 | Public category/tag filter pages | `/blog/category/[slug]`, `/blog/tag/[slug]`; same grid; `notFound()` on unknown slugs; categories/tags with zero published posts render empty-state |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Markdown → HTML rendering (articles) | API / Backend (RSC) | Browser / Client (editor preview) | react-markdown renders server-side in `markdown-content`; the editor preview mirrors it client-side via a shared components map |
| Public blog data fetching | API / Backend | — | Server components query Neon directly with `force-dynamic`; no client fetch |
| Search (ILIKE) | API / Backend | — | Query lives in the `/blog/search` page; escaping is a pure helper (`escapeLike`) |
| Post/category/tag mutations | API / Backend | — | Server actions re-verify auth + ownership; proxy is only a convenience gate |
| Image upload | API / Backend | Browser / Client (validation + FormData) | Route handler `/api/uploads` under proxy auth; client validates type/size |
| Blog navigation & editor interactions | Browser / Client | — | `editor-shell`, `tags-input`, `cover-upload`, `blog-search` are client components receiving serializable props |
| Auth gating (admin vs public) | API / Backend (proxy.ts) | — | Matcher covers `/admin` `/posts` `/api`; `/blog` intentionally unmatched → public |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-markdown | 10.1.0 | Render markdown to React elements (server + preview) | De-facto standard; builds a virtual DOM (no dangerouslySetInnerHTML); safe by default; works in RSC; ESM, Node 16+; peer react >= 18 ✓ |
| remark-gfm | 4.0.1 | GFM extensions (tables, strikethrough, tasklists, autolinks) | Official remark ecosystem companion; needed for the UI-SPEC GFM table styles |

**Both are the ONLY new runtime dependencies.** Everything else reuses the Phase 0 stack (Next 16.2.12, React 19.2.4, Zod 4.4.3, @neondatabase/serverless 1.1.0, shadcn/ui, lucide-react, sonner).

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 4.4.3 (existing) | Extended `postSchema` + new `categorySchema`/`tagSchema`/`slugSchema` | All CMS form/action validation in `lib/validate.ts` |
| @neondatabase/serverless | 1.1.0 (existing) | neon tagged templates for all CMS queries | Parameterized ILIKE, JOINs, array_agg — no ORM |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-markdown (RSC) | remark/rehype pipeline + rehype-react | More control but far more plumbing; react-markdown wraps the same pipeline |
| react-markdown | marked / markdown-it (innerHTML-based) | Those require `dangerouslySetInnerHTML` → XSS surface; rejected by UI-SPEC security note |
| react-markdown | @tailwindcss/typography + raw HTML render | UI-SPEC locks token-based hand styles and no rehype-raw; typography plugin would also style via classes but adds a plugin dep |
| text+CHECK `status` | Postgres native ENUM type | PG enum changes require `ALTER TYPE ... ADD VALUE` transactions and break with Neon branching; text+CHECK matches the template's `status text NOT NULL` convention in mock_* tables |
| `published_at` column | Order by `created_at` only | created_at predates publication for drafts; published_at gives correct public ordering with `COALESCE` |

**Installation:**
```bash
npm install react-markdown@10.1.0 remark-gfm@4.0.1
```

**Version verification:** `npm view react-markdown version` → 10.1.0 (published 2025-03-07, no postinstall script); `npm view remark-gfm version` → 4.0.1 (published 2025-02-10). Both verified against the official remarkjs GitHub repos.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| react-markdown | npm | ~8 yrs (10.1.0: 2025-03) | 27.3M/wk | github.com/remarkjs/react-markdown | OK | Approved |
| remark-gfm | npm | ~5 yrs (4.0.1: 2025-02) | 34.0M/wk | github.com/remarkjs/remark-gfm | OK | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
*Both packages verified via `gsd-tools query package-legitimacy check` (verdict OK, no postinstall scripts) AND official remarkjs documentation.*

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────────────────┐
                    │                   proxy.ts (Next 16)                │
                    │  matcher: /api/*  /admin/*  /dashboard/*  /posts/*  │
                    │  ── /blog/** NOT matched → public, no session check │
                    └──────┬──────────────────────┬───────────────────────┘
                           │                      │
        GET /blog/**,      │                      │  POST /api/uploads (auth req.)
        GET /posts/**,     │                      │  POST /api/auth/* (whitelisted)
        POST server actions│                      ▼
                           ▼           ┌───────────────────────┐
              ┌───────────────────┐    │ app/api/uploads/route │
              │  (main) AppShell  │    │ FormData → base64 →   │
              │  /blog  /posts    │    │ storage.upload()      │
              └─────────┬─────────┘    └──────────┬────────────┘
                        │                         │
                        ▼                         ▼
              ┌────────────────────────────────────────────────────────┐
              │              Neon Postgres (raw SQL, neon())           │
              │  posts (+status, slug, category_id, cover_image,       │
              │        published_at)  categories  tags  post_tags      │
              │  mock_uploads (metadata only: name, url, size_bytes)   │
              └────────────────────────────────────────────────────────┘
                        ▲
                        │  scripts/seed.ts (tsx, direct URL, ledger)
              ┌─────────┴───────────────────────────────────────────────┐
              │ db/migrations/001_init.sql → 002_cms.sql (idempotent)   │
              └─────────────────────────────────────────────────────────┘

  Data flow (primary use case): /blog → page (force-dynamic) → sql JOIN
  posts+categories+tags → blog-card grid → /blog/[slug] → markdown-content
  (react-markdown + remark-gfm, server) → article typography
```

### Recommended Project Structure (Phase 1 additions)

```
db/migrations/
└── 002_cms.sql                 # categories, tags, post_tags + posts evolution
app/(main)/
├── blog/                       # NEW public route group (AppShell, force-dynamic)
│   ├── page.tsx                # /blog — Features grid
│   ├── search/page.tsx         # /blog/search?q=… — ILIKE results
│   ├── category/[slug]/page.tsx
│   ├── tag/[slug]/page.tsx
│   ├── [slug]/page.tsx         # article + related
│   ├── loading.tsx             # blog-grid skeleton (shared)
│   └── error.tsx
└── posts/
    ├── actions.ts              # EXTENDED: status/slug/category/tags/cover
    ├── page.tsx                # posts table: status badge, category, tags cols
    ├── new/page.tsx            # → editor-shell (create)
    └── [id]/edit/page.tsx      # → editor-shell (edit), ownership-scoped
app/api/uploads/route.ts        # NEW upload endpoint (proxy-gated)
app/admin/
├── categories/page.tsx         # NEW admin category management
└── tags/page.tsx               # NEW admin tag management
components/
├── blog/                       # NEW public components
│   ├── blog-card.tsx  cover-image.tsx  blog-search.tsx
│   ├── category-badge.tsx  tag-chip.tsx  related-posts.tsx
│   └── markdown-content.tsx    # server renderer
├── posts/                      # NEW editor components
│   ├── editor-shell.tsx  markdown-preview.tsx  tags-input.tsx  cover-upload.tsx
│   └── markdown-components.tsx # SHARED components map (server+client, no drift)
└── admin/
    ├── category-dialog.tsx  tag-dialog.tsx
    └── cms-category-table.tsx  cms-tag-table.tsx
lib/
├── blog.ts                     # NEW client-safe pure helpers (slugify, escapeLike,
│                               #   parseTags, readingTime, excerpt) — unit-tested
└── validate.ts                 # EXTENDED: postSchema, categorySchema, tagSchema
scripts/seed.ts                 # EXTENDED: 5 posts, 4 categories, 6-8 tags,
                                #   post_tags joins, picsum covers, status
__tests__/
├── blog.test.ts                # NEW pure-function tests
└── validate.test.ts            # EXTENDED schema tests
```

### Pattern 1: Idempotent CMS Migration (`db/migrations/002_cms.sql`)

Follows the Phase 0 ledger pattern exactly: file name sorts after `001_init.sql`, applied by `npm run seed` (runner splits on `;\n` when the driver rejects multi-statement payloads — every statement must end with `;` + newline). All statements use `IF NOT EXISTS` / `IF EXISTS` and the data backfill is naturally idempotent (WHERE-guarded), so a partially-applied file can be re-run after fixing the offending statement.

**Sequence matters:** (1) create taxonomy tables → (2) add `status` → (3) backfill from `published` → (4) drop `published` → (5) add remaining columns → (6) backfill slugs → (7) indexes.

```sql
-- 002_cms.sql — Phase 1 CMS schema (idempotent; applied by npm run seed)

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- posts evolution: boolean published → status (text + CHECK, template convention)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category_id uuid
  REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_image text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Backfill (runs once via ledger; idempotent by its WHERE clause)
UPDATE posts SET status = 'published' WHERE published = true AND status = 'draft';
ALTER TABLE posts DROP COLUMN IF EXISTS published;

-- Backfill slugs for pre-CMS rows (3 seeded posts), then enforce uniqueness.
-- ADD CONSTRAINT has no IF NOT EXISTS; a unique index is ledger-safe and
-- produces the same 23505 error code on violation.
UPDATE posts SET slug = btrim(regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'), '-')
WHERE slug IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_idx ON posts (slug);
CREATE INDEX IF NOT EXISTS posts_category_id_idx ON posts (category_id);
CREATE INDEX IF NOT EXISTS posts_published_idx ON posts (published_at DESC)
  WHERE status = 'published';
```

**Gotchas:** (a) the runner splits on `;\n` — keep every statement on its own line ending with `;`; (b) `UPDATE ... WHERE slug IS NULL` is safe to re-run; (c) the seed's `TABLES` report array in `scripts/seed.ts` must gain `categories`, `tags`, `post_tags` (counts + 200 MB gate stay accurate).

### Pattern 2: Public Routes vs Proxy Guard — No Changes Needed

`proxy.ts` matcher is `["/api/:path*", "/admin/:path*", "/dashboard/:path*", "/posts/:path*"]`. `/blog/**` is **not matched** → the proxy never runs for it → public by construction. Do NOT add `/blog` to the matcher. Consequences:

- `/blog/*` pages: no session check, no `getCurrentUser` needed (use it only to render auth-dependent UI if desired).
- `/api/uploads`: under `/api/:path*` → non-GET requests hit the CSRF origin check (browsers always send Origin — fine) and require a session (401 JSON without one). Uploads are admin-only, as designed.
- All public blog pages still need `export const dynamic = "force-dynamic"` (AGENTS.md) and `WHERE status = 'published'`.
- `params` is a Promise in Next 16 (`params: Promise<{ slug: string }>` — await it), same for `searchParams: Promise<{ q?: string }>` (established pattern in `app/(main)/posts/[id]/edit/page.tsx`).

### Pattern 3: Parameterized ILIKE Search (one endpoint, page-level)

`/blog/search` is a **page**, not a route handler — the UI-SPEC GET-form flow submits to a server-rendered page (no client fetch, no debounce). Query is one parameterized statement (neon tagged template — no string interpolation of user input):

```typescript
// lib/blog.ts (client-safe, unit-tested)
export function escapeLike(q: string): string {
  // ILIKE treats backslash as the default escape char; neutralize user wildcards
  return q.replace(/[\\%_]/g, "\\$&");
}
```

```typescript
// app/(main)/blog/search/page.tsx (excerpt — see Code Examples for full shape)
const q = (await searchParams).q?.trim() ?? "";
if (!q || q.length > 100) redirect("/blog");
const pattern = `%${escapeLike(q)}%`;
const rows = await sql`
  SELECT DISTINCT p.id, p.title, p.slug, p.cover_image, p.author_id, u.name AS author_name
  FROM posts p
  JOIN users u ON u.id = p.author_id
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN post_tags pt ON pt.post_id = p.id
  LEFT JOIN tags t ON t.id = pt.tag_id
  WHERE p.status = 'published'
    AND (p.title ILIKE ${pattern} OR p.content ILIKE ${pattern}
         OR c.name ILIKE ${pattern} OR t.name ILIKE ${pattern})
  ORDER BY COALESCE(p.published_at, p.created_at) DESC`;
```

`DISTINCT` dedupes posts with multiple matching tags. Escaping `%`/`_` keeps user input literal (no wildcard injection). Content search on a TEXT column is acceptable at demo scale (5 posts; no pg_trgm index needed — the 200 MB budget is untouched).

### Pattern 4: Markdown Rendering — Shared Components Map + CSS Class

UI-SPEC quality bar #1 demands preview mirrors the article exactly. One shared source prevents drift:

- `components/posts/markdown-components.tsx` — exports the react-markdown `components` map (h1→h2 remap per a11y rule, `a`/`pre`/`code`/`img` class assignments) and the shared `remarkPlugins={[remarkGfm]}` constant. Imported by BOTH `markdown-content` (server) and `markdown-preview` (client) — a plain .tsx module with no directive is safe for both.
- `app/globals.css` — one `.article-body` class implementing the UI-SPEC typography table (token-based: `var(--primary)`, `var(--muted)` etc.; `@apply` or raw CSS; no typography plugin). Drop cap uses `.article-body > p:first-child::first-letter` so it applies only when the first element is a paragraph (UI-SPEC backstop).

**XSS posture (verified from official README):** react-markdown is safe by default — no `dangerouslySetInnerHTML`; raw HTML in markdown is escaped unless you opt into `rehype-raw` (we do NOT); `defaultUrlTransform` permits only `http/https/irc/ircs/mailto/xmpp` + relative URLs (javascript: URLs stripped). Optional hardening: `rehype-sanitize` is unnecessary at this trust level — skip it (keeps deps to the locked two).

### Pattern 5: Server Action Extensions (posts) + New Taxonomy Actions

Extend `app/(main)/posts/actions.ts` following the existing `{ ok }` return + ownership-scoped SQL pattern (never trust client-claimed ownership; proxy is convenience only):

- `parsePost` reads: title, slug, status ("draft"|"published" from hidden field), categoryId ("" → null), tags (comma-joined hidden field → `parseTags`), coverImage (hidden field, may be empty).
- Duplicate slug → catch the DB unique violation (`error.code === "23505"`) and return `{ message: "A post with this slug already exists." }` (UI-SPEC copy). Pre-check SELECT is a second query; the 23505 catch is one.
- Publish transition: `published_at = now()` when status becomes "published" and wasn't before; leave/clear when reverting to draft (keep simple: set when publishing, `NULL` for drafts).
- Tags: delete-and-reinsert `post_tags` for the post inside the same update (3 statements; no transaction strictly needed at demo scale — but `withPool` exists if the planner wants atomicity; note neon HTTP `sql` calls are separate round-trips).
- `revalidatePath("/posts")` (existing) + `revalidatePath("/admin/categories")`/`("/admin/tags")` for taxonomy actions; public pages are force-dynamic so they need no revalidation.
- New actions file or same file: `createCategory`, `renameCategory`, `deleteCategory`, `createTag`, `renameTag`, `deleteTag` — all auth-checked, `{ ok }` + toast pattern. Category delete relies on FK `ON DELETE SET NULL` (posts become uncategorized automatically); tag delete relies on `ON DELETE CASCADE` for join rows. No custom cleanup SQL.

### Pattern 6: Editor (editor-shell) Data Contract

`editor-shell` (client) replaces `post-form`. Hidden fields carry the non-native inputs: `status` (from segmented control), `categoryId` (select value, "" = none), `tags` (comma-joined from `tags-input`), `cover_image` (URL from `cover-upload`). `useActionState` bound to create/update actions; success → toast + `router.push("/posts")` + `router.refresh()`; inline errors for validation; destructive Alert for server messages (duplicate slug / stale post with "Back to posts" link). Slug auto-derivation on blur uses the same `slugify` from `lib/blog.ts` (client-safe). Edit mode prefill comes from the server page (ownership-scoped fetch → `notFound()` if not owner, matching current edit page).

### Anti-Patterns to Avoid

- **Adding `/blog` to the proxy matcher** — it is public by design; gating it breaks the demo for guests.
- **Rendering markdown with `dangerouslySetInnerHTML`** (marked/markdown-it) or adding `rehype-raw` — the single biggest XSS regression risk; UI-SPEC locks escaped-HTML rendering.
- **Two markdown style sources** (separate class sets for preview vs article) — guaranteed visual drift; share `markdown-components.tsx` + `.article-body`.
- **Client-side search with `useEffect`+`fetch`** — the GET-form server page pattern is instant, SEO-visible, and matches the template's server-first rule.
- **Backfilling slugs only in seed** — a fresh DB gets slugs, but any non-seed row stays NULL forever; the migration backfill keeps the invariant in SQL.
- **N+1 queries** (per-post category/tag lookups in the blog list) — one JOIN+GROUP BY+`array_agg` query per page.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown parsing/rendering | Regex markdown, `innerHTML` renderers | react-markdown + remark-gfm | CommonMark/GFM compliance, virtual DOM, safe-by-default XSS posture, plugin ecosystem |
| Form state / submit lifecycle | Manual state + fetch handlers | `useActionState` (React 19) | Established template pattern; pending states, error mapping, server action binding |
| Input validation | Hand-written if/else checks | Zod schemas in `lib/validate.ts` | Existing pattern; `flattenError` field errors feed inline form errors |
| Image upload transport | Roll-your-own storage, DB blob columns | Existing `storage.upload({name, data})` mock | Interface matches real blob providers; metadata-only persistence (never store blobs — Pitfall 9 in research/PITFALLS.md) |
| Date formatting | Manual date strings | `Intl.DateTimeFormat` | Already the template convention (posts-table, admin pages) |
| Confirm-dialog UX | Custom modal state | shadcn `AlertDialog` + `DropdownMenu` | Already installed; destructive-action pattern is template-locked |

**Key insight:** this phase is an integration exercise, not a greenfield build — every hard problem (auth, DB access, validation, forms, mock services, theme) already has a proven template answer. The new surface area is exactly two npm packages (markdown rendering) plus schema/seed evolution; everything else composes existing pieces.

## Runtime State Inventory

> N/A — greenfield extension phase (no rename/refactor of runtime state). The posts table evolution is a **code edit + one-time data backfill inside the migration** (published→status, slug backfill), both covered by `002_cms.sql`. No OS registrations, external service configs, secrets, or build artifacts change.

## Common Pitfalls

### Pitfall 1: Vercel 4.5 MB function body limit vs base64 upload
**What goes wrong:** UI-SPEC locks "File must be an image under 4 MB." A 4 MB file base64-encoded is ~5.33 MB — Vercel Functions reject payloads over **4.5 MB** with `413 FUNCTION_PAYLOAD_TOO_LARGE` (verified in Vercel docs, 2026-07-01). The upload works locally and silently fails after deploy for files > ~3.3 MB.
**Why it happens:** `storage.upload({ name, data })` receives a base64 string; FormData → base64 inflates ~33% (multipart overhead too).
**How to avoid:** Cap the client validation at **3 MB** (3 MB → ~4.1 MB base64, safely under 4.5 MB) AND validate size server-side in the route handler (never trust the client). This contradicts the UI-SPEC "4 MB" copy — flag for the discuss phase / UI-SPEC amendment ("under 3 MB"), or accept the edge case with the generic "Cover upload failed. Try again." alert as backstop.
**Warning signs:** Uploads succeed in dev, 413 in production; working images up to 3 MB fail above it.

### Pitfall 2: Forgetting a `published` touchpoint during the boolean→status migration
**What goes wrong:** Mixed semantics — DB says `status`, one file still reads `posts.published` → runtime error ("column posts.published does not exist").
**Why it happens:** Six files reference `published` today: `scripts/seed.ts`, `app/(main)/posts/actions.ts`, `posts/page.tsx`, `posts/[id]/edit/page.tsx`, `components/posts/posts-table.tsx`, `components/posts/post-form.tsx` (replaced), plus `lib/validate.ts` (`postSchema.published`).
**How to avoid:** Grep `published` after the migration task; the plan should list every touchpoint explicitly. Consider renaming the column in one plan task and updating all references in the same task (or a dedicated migration task).
**Warning signs:** `npm run build` passes but the posts list 500s; `npx tsc --noEmit` doesn't catch SQL column names.

### Pitfall 3: Slug drift — DB unique violation surfacing as a 500
**What goes wrong:** Two posts get the same slug → raw Postgres error → 500 instead of the UI-SPEC destructive Alert "A post with this slug already exists."
**Why it happens:** Slugs are auto-derived from titles (collision-prone: "Hello World" twice); the unique index throws 23505 which the action must catch and translate.
**How to avoid:** Wrap the INSERT/UPDATE in try/catch checking `(error as { code?: string }).code === "23505"` → return `{ message: "A post with this slug already exists." }`. Same for categories/tags slugs ("A category with this slug already exists." / "A tag with this slug already exists.").
**Warning signs:** Any 500 after submitting the editor with a repeated title.

### Pitfall 4: Draft leakage through public routes
**What goes wrong:** `/blog/[slug]` matches a draft's slug → draft content visible to guests, or an error page leaking that the post exists.
**Why it happens:** Slug lookup without the `status = 'published'` filter; or `notFound()` only for non-existent rows.
**How to avoid:** Every public query hard-filters `WHERE status = 'published'`. `/blog/[slug]` with `status='published'` in the WHERE → 0 rows for drafts → `notFound()` (identical 404 for unknown slug and draft — no enumeration). Category/tag pages: a category with only drafts shows the empty-state, never the drafts.
**Warning signs:** A draft created in the editor appears on `/blog` or is viewable by slug.

### Pitfall 5: react-markdown client/server drift and CSS bleed
**What goes wrong:** Preview styles differ from the article (different spacing, link colors); or article styles leak into the admin area.
**Why it happens:** Two ad-hoc class sets; or component-level Tailwind classes that can't be shared between the client preview and server article without a shared module.
**How to avoid:** Single `markdown-components.tsx` + single `.article-body` class in `globals.css` consumed by both components; scope styles under `.article-body` only; never style bare `p`/`h2` globally.
**Warning signs:** Visual check of a seeded post in the editor vs `/blog/[slug]` shows differences (UI-SPEC Quality Bar #1 will fail).

### Pitfall 6: Search wildcard injection / empty-query noise
**What goes wrong:** `%` or `_` in the query acts as a wildcard (matches everything); empty or whitespace queries render useless result pages.
**Why it happens:** Raw `%${q}%` interpolation without escaping; missing trim/length guards.
**How to avoid:** `escapeLike` (Pattern 3) + `q.trim()`, redirect `/blog` on empty or > 100 chars (UI-SPEC). ILIKE stays parameterized via neon tagged template.
**Warning signs:** Searching `%` returns every post; searching spaces shows a results page.

## Code Examples

Verified patterns from official sources:

### Markdown server component (article page)
```tsx
// components/blog/markdown-content.tsx (server — no "use client")
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "@/components/posts/markdown-components";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="article-body">
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </Markdown>
    </div>
  );
}
```
Source: [official react-markdown README — use with plugins](https://github.com/remarkjs/react-markdown) (verified 2026-08-02). `remarkPlugins`/`components` API and safe-by-default HTML escaping confirmed from the same source.

### Reading time + excerpt helpers (pure, unit-tested)
```typescript
// lib/blog.ts — client-safe (NO "server-only"; editor imports it)
export function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
export function excerpt(content: string, max = 160): string {
  const plain = content.replace(/[#>*`_~[\]()!-]/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
}
export function parseTags(input: string, max = 8): string[] {
  const seen = new Set<string>();
  return input
    .split(/[,，\n]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()) ? true : false)
    .slice(0, max);
}
export function slugify(title: string): string {
  return title.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
export function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, "\\$&");
}
```

### Upload route handler (`app/api/uploads/route.ts`)
```typescript
import { NextResponse } from "next/server";
import { storage } from "@/lib/mock";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_BYTES = 3 * 1024 * 1024; // see Pitfall 1 — Vercel 4.5 MB body limit vs base64

export async function POST(request: Request) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large." }, { status: 413 });
  }
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const { url, size } = await storage.upload({ name: file.name, data });
  return NextResponse.json({ url, size }, { status: 201 });
}
```
Matches the verified `storage.upload({ name, data }) → { url, size }` signature in `lib/mock/storage.ts` and the proxy's `/api/*` auth + Origin-check behavior (browsers always send Origin on POST → passes).

### Blog list query (single round-trip, no N+1)
```typescript
const rows = await sql`
  SELECT p.id, p.title, p.slug, p.cover_image,
         p.content, COALESCE(p.published_at, p.created_at) AS published_at,
         u.name AS author_name,
         c.slug AS category_slug, c.name AS category_name,
         COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tag_names,
         COALESCE(array_agg(t.slug) FILTER (WHERE t.slug IS NOT NULL), '{}') AS tag_slugs
  FROM posts p
  JOIN users u ON u.id = p.author_id
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN post_tags pt ON pt.post_id = p.id
  LEFT JOIN tags t ON t.id = pt.tag_id
  WHERE p.status = 'published'
  GROUP BY p.id, u.name, c.slug, c.name
  ORDER BY COALESCE(p.published_at, p.created_at) DESC`;
```
(Grouping by `p.id` is valid — Postgres functional dependency on the primary key.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `published` boolean checkbox | `status` text enum (draft/published) + segmented control | Phase 1 | Drafts/published get explicit workflow states; public pages filter on status |
| Raw textarea-only post form | Markdown editor with live preview (react-markdown, RSC render) | Phase 1 | Blog-grade content authoring; XSS-safe by default |
| Blog URLs by id (`/posts/[id]/edit`) | Clean public slug URLs (`/blog/[slug]`) | Phase 1 | SEO-visible, shareable URLs; slug uniqueness enforced in DB |
| Single flat CRUD reference | Taxonomy (categories/tags) + search + public pages | Phase 1 | Validates the template against the most recognizable fullstack pattern |

**Deprecated/outdated:**
- `react-markdown` v8 `skipHtml` prop: removed in v9+ — raw HTML is simply not rendered by default; do not look for the prop (verified in v10 API docs: only `skipHtml` (default false) exists, which *ignores* HTML — either way raw HTML never renders as markup).
- `middleware.ts` auth convention: Next 16 renamed it to `proxy.ts` (AGENTS.md hard rule — already applied in Phase 0).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Neon/Postgres unique-violation error exposes `error.code === "23505"` | Pattern 5 / Pitfall 3 | Catch fails → 500 on duplicate slug. Mitigation: also pre-check slug existence with a SELECT (belt-and-braces) or inspect the error message text |
| A2 | ILIKE's default escape character is backslash, so `escapeLike` works without an explicit `ESCAPE` clause | Pattern 3 | If a Neon/Postgres variant changed the default, `%`/`_` in user queries could act as wildcards. Low risk — standard Postgres behavior |
| A3 | `GROUP BY p.id` (PK) allows selecting other posts columns in Neon (Postgres 16/17 functional dependency) | Code Examples | Would need explicit GROUP BY of all selected columns. Verified standard Postgres behavior, not tested against this Neon instance this session |
| A4 | react-markdown 10.1.0 renders fine inside jsdom for component tests | TDD targets | If ESM/jsdom quirks appear, fall back to testing the pure helpers only and keep the sanitize test as a manual verify step |
| A5 | picsum.photos remains reachable/free for seed covers | Seed | If unreachable, `cover-image` `onError` hides broken covers (graceful degradation already designed) — demo photos would be missing |
| A6 | `storage.upload` accepting ~4 MB base64 strings in local dev (no body limit locally) | Pitfall 1 | Local dev masks the deployed 413 — the 3 MB cap must be enforced client+server side, not discovered by testing locally |

## Open Questions

1. **Upload size cap copy conflict (UI-SPEC "under 4 MB" vs Vercel 4.5 MB body limit)**
   - What we know: verified 4.5 MB function payload limit; base64 inflates ~33%; 4 MB client cap breaks on deploy for files > ~3.3 MB.
   - What's unclear: whether to amend the UI-SPEC copy to "under 3 MB" (clean) or keep 4 MB copy with a 3 MB real cap (dishonest) or accept the edge case.
   - Recommendation: planner should add a task/note flagging the UI-SPEC amendment to the discuss-phase; research recommends 3 MB cap + server-side re-check, with copy updated to "under 3 MB".

2. **Tags upsert atomicity**
   - What we know: post update + delete/reinsert `post_tags` is 3 neon HTTP calls (non-transactional); `withPool` exists for BEGIN/COMMIT.
   - What's unclear: acceptable risk of a torn write at demo scale.
   - Recommendation: single-user demo → accept non-atomic (simplest); wrap in `withPool` only if plan-01-01 budget allows.

3. **`h1` in markdown body**
   - What we know: UI-SPEC forbids h1 in body (page title is the H1) and requires the executor to skip/strip it.
   - What's unclear: whether to remap h1→h2 (document outline safe) or drop h1 content entirely.
   - Recommendation: remap h1→h2 in the shared `markdownComponents` map — one line, no content loss, a11y-safe. Planner picks.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/dev/tests | ✓ | 24.18.0 | — |
| npm | installs | ✓ | 11.18.0 | — |
| Neon Postgres | all CMS data | ✓ (Phase 0 seeded) | via .env.local | — |
| react-markdown + remark-gfm | editor + article render | install in plan 01-01 | 10.1.0 / 4.0.1 | — |
| picsum.photos | seed cover images (view-time) | ✓ (external, browser-side) | — | `cover-image` onError hides broken covers |
| vitest + jsdom + RTL | unit/component tests | ✓ (Phase 0) | 4.1.10 | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** picsum.photos (degradation by design — text-only cards).

## Validation Architecture

> **Skipped:** `.planning/config.json` sets `workflow.nyquist_validation: false` explicitly. Phase verification follows the standard UAT/verification flow; the TDD targets below are still recommended because `tdd_mode: true`.

**Recommended TDD targets (for the planner's plan tasks):**
- `__tests__/blog.test.ts` (NEW): `slugify` (hyphens, trim, collapse, empty), `escapeLike` (`%`, `_`, `\`, plain text), `readingTime` (empty → 1, 200 words → 1, 201 words → 2), `excerpt` (strip markdown tokens, clamp + ellipsis), `parseTags` (comma/newline split, dedupe case-insensitive, cap 8).
- `__tests__/validate.test.ts` (EXTEND): postSchema — slug regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` (reject uppercase/spaces), status enum (reject "live"), categoryId nullable uuid (reject non-uuid), tags transform (comma string → array, cap 8), coverImage optional URL; categorySchema/tagSchema — name min 2, slug regex.
- Component test (jsdom + RTL, vitest already configured): render `MarkdownContent` with `<script>alert(1)</script>` and `<img src=x onerror=...>` in content → assert no `script` element and no `onerror` attribute in the DOM. Verifies the XSS posture reactively.
- `npm run test` (vitest run) stays the quick/full suite; existing mock storage tests already cover `storage.upload` metadata-only behavior.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (inherited) | jose JWT httpOnly cookie, proxy gate — unchanged; actions re-verify `getCurrentUser` |
| V3 Session Management | yes (inherited) | Existing session cookie; no new session surface |
| V4 Access Control | yes | `/api/uploads` requires session (proxy + route re-check); post mutations scoped `author_id`; taxonomy actions auth-checked; public pages never touch drafts |
| V5 Input Validation | yes | Zod 4 schemas for all new inputs (slug regex, status enum, uuid categoryId, ≤ 8 tags, file type/size server-side) |
| V6 Cryptography | no | No new crypto; markdown has no crypto surface |

### Known Threat Patterns for {CMS stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via markdown raw HTML (`<script>`, event handlers) | Tampering | react-markdown safe-by-default: raw HTML escaped, no `rehype-raw`, `defaultUrlTransform` protocol allowlist (verified official README) |
| `javascript:` URLs in links/images | Tampering | Default `urlTransform` strips non-allowlisted protocols |
| SQL injection via search / slug params | Tampering | neon tagged-template parameterization everywhere; `escapeLike` neutralizes wildcards; `isUuid` guards id params |
| Draft/post enumeration via public slugs | Information Disclosure | `WHERE status = 'published'` on every public query; unknown/draft slug → identical `notFound()` |
| CSRF on upload/mutations | Spoofing | Proxy Origin/referer check for non-GET `/api/*` (already enforced); server actions use SameSite=Lax cookies |
| IDOR on post edit/delete | Information Disclosure | Ownership-scoped SQL (`AND author_id = ${user.id}`) on read and write — inherited pattern, extended to new fields |

## Sources

### Primary (HIGH confidence)
- [react-markdown official README (remarkjs/react-markdown)](https://github.com/remarkjs/react-markdown) — fetched 2026-08-02: safe-by-default, no dangerouslySetInnerHTML, raw HTML escaped unless rehype-raw, `defaultUrlTransform` protocol allowlist, `remarkPlugins`/`components` API, h1 remap example
- [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations) — fetched 2026-08-02: 4.5 MB request/response body limit, 413 FUNCTION_PAYLOAD_TOO_LARGE
- [Vercel Limits](https://vercel.com/docs/limits) — fetched 2026-08-02: Hobby plan usage summary
- npm registry (`npm view react-markdown` / `remark-gfm`): 10.1.0 / 4.0.1, no postinstall scripts
- gsd-tools `package-legitimacy check`: both OK
- Codebase (verified by read): `db/migrations/001_init.sql`, `scripts/seed.ts`, `app/(main)/posts/*`, `lib/db.ts`, `lib/validate.ts`, `lib/mock/storage.ts`, `lib/mock/index.ts`, `proxy.ts`, `package.json`, `vitest.config.mts`, `__tests__/*`, `app/globals.css`, layouts/shells, `lib/site.ts`, `lib/session.ts`

### Secondary (MEDIUM confidence)
- Next.js App Router conventions inferred from the working Phase 0 codebase (`params: Promise`, `force-dynamic`, route groups) — verified in-repo, not against nextjs.org this session

### Tertiary (LOW confidence)
- Postgres-specific behaviors (23505 error code, ILIKE escape default, GROUP BY PK functional dependency) — standard Postgres knowledge, tagged [ASSUMED] (see Assumptions Log)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — both packages verified on registry + official docs + legitimacy gate
- Architecture: HIGH — every pattern maps to verified in-repo code (seed runner, proxy matcher, storage signature, actions pattern)
- Pitfalls: MEDIUM — Vercel body limit verified; 23505/ILIKE behaviors [ASSUMED] but standard; migration runner behavior documented in seed.ts comments

**Research date:** 2026-08-02
**Valid until:** 2026-09-01 (30 days — stable stack; re-verify react-markdown major version before then)

---

## Key Decisions for Planner (8-12 items)

1. **`002_cms.sql` migration (plan 01-01, first task):** create `categories`, `tags`, `post_tags`; evolve `posts` — add `status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published'))`, backfill `published=true → 'published'`, drop `published`; add `slug` (backfill via `regexp_replace(lower(title), ...)`, unique index), `category_id` (FK SET NULL), `cover_image`, `published_at`. Every statement `IF [NOT] EXISTS`-guarded + `;\n` terminated (runner split rule). Update seed `TABLES` report array.
2. **Update all six `published` touchpoints in the SAME wave as the migration:** `scripts/seed.ts`, `posts/actions.ts`, `posts/page.tsx`, `posts/[id]/edit/page.tsx`, `posts-table.tsx` (status badge), `post-form.tsx` → replaced by `editor-shell`. Grep `published` after to prove none remain.
3. **Install `react-markdown@10.1.0` + `remark-gfm@4.0.1`** (verified OK, no postinstall). No rehype-raw, no typography plugin, no other deps.
4. **Shared markdown pipeline:** `components/posts/markdown-components.tsx` (components map incl. h1→h2 remap + `[remarkGfm]`) consumed by BOTH `markdown-content` (server) and `markdown-preview` (client); ONE `.article-body` class in `globals.css` (token-based styles, drop cap via `> p:first-child::first-letter`).
5. **Public /blog routes under `(main)` AppShell; proxy.ts untouched** (matcher excludes /blog → public). All public pages: `force-dynamic`, `WHERE status='published'`, `params`/`searchParams` awaited, `notFound()` for unknown/draft slugs.
6. **Search = page, not route handler:** `/blog/search` with `searchParams: Promise<{q?}>`, trim + empty/>100 chars → `redirect("/blog")`, `escapeLike` + single parameterized ILIKE across title/content/category/tag with `DISTINCT`, `ORDER BY COALESCE(published_at, created_at) DESC`.
7. **Upload cap = 3 MB (client + server), not 4 MB** — base64 + Vercel 4.5 MB body limit (verified). Flag UI-SPEC copy amendment ("under 3 MB") for the discuss phase; route returns 201 `{url, size}`.
8. **Extend `postSchema`** (slug regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`, status enum, nullable uuid categoryId, tags comma→array transform ≤ 8, optional coverImage) **+ new `categorySchema`/`tagSchema`** in `lib/validate.ts`; duplicate slugs → catch 23505 → UI-SPEC alert copy.
9. **New `lib/blog.ts`** (client-safe, no server-only): `slugify`, `escapeLike`, `parseTags`, `readingTime`, `excerpt` — shared by editor-shell (slugify/parseTags) and pages (readingTime/excerpt/escapeLike); unit-tested in `__tests__/blog.test.ts`.
10. **Seed v2:** 5 realistic posts (enrich 3 existing + 2 new), 4 categories, 6–8 tags, post_tags joins, `status`/`published_at`/`slug`/picsum `cover_image` upserts via `ON CONFLICT (id) DO UPDATE`; fixed UUIDs for categories/tags; never lorem ipsum.
11. **Admin taxonomy:** `/admin/categories` + `/admin/tags` under existing AdminShell (proxy-gated); category/tag dialogs + tables per UI-SPEC; delete relies on FK semantics (SET NULL / CASCADE) — no manual cleanup SQL; AdminShell gains "Content" group; admin overview +2 StatCards.
12. **Nav:** "Blog" → `/blog` visible to guests AND users in `site-header` desktop nav, `mobile-nav`, and `lib/site.ts` `defaultNav`; editor status segmented control posts `status` hidden field; `editor-shell` replaces `post-form` (posts/new + posts/[id]/edit pages swap component, edit prefill from ownership-scoped fetch).
