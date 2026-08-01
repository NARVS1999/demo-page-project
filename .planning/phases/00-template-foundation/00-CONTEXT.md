# Phase 0: Template Foundation - Context

**Gathered:** 2026-08-02
**Status:** Ready for planning

<domain>
## Phase Boundary

A battle-tested reusable `nextjs-starter` template that every subsequent project inherits from — auth, database layer, mock services, seed script, and UI components, all designed to prevent the 10 critical pitfalls identified in research. Delivers: register/login/logout with Postgres-persisted sessions via jose JWT, `npm run seed` populating Neon Postgres with demo data (storage report under 200 MB), 6 importable mock services matching real API shapes, Zod env validation on startup, `.env.example`, dark/light theme toggle, loading/error states, and a sample CRUD page as reference implementation.

</domain>

<decisions>
## Implementation Decisions

### Auth & Session Security
- Signed JWT in httpOnly cookie with 30-day expiry — matches "session persisted via jose JWT" success criterion; stateless, zero extra schema needed
- Next.js middleware checks JWT for `/admin` and `/api/*` routes — single enforcement point, fast
- Login errors shown as inline field errors + redirect on success — standard shadcn form pattern
- Registration fields: email + name + password (Zod-validated, min 8 chars)

### Database Layer
- Raw SQL via `@neondatabase/serverless` with typed helpers in `lib/db.ts` — no ORM (consistent with "no Prisma" decision)
- Idempotent SQL migration files in `db/migrations/` run by seed — versioned and replayable
- `neon()` for serverless edge queries + `Pool` for transactions — per TMPL-03
- Seed reports per-table row counts + `pg_database_size` total in MB — proves the <200 MB criterion

### Mock Services Layer
- Simplified interfaces matching real API shapes (payment, email, SMS, OAuth, maps, storage) — swappable later without touching business logic
- DB-backed simulation — mock events persisted to tables, viewable in admin
- `MOCK_*` env vars pick mock vs real provider — defaults to mock
- Optional `fail: true` param on mock payment — lets demos show error states

### Template UX & Seed Data
- `next-themes` with localStorage persistence + system default
- Sample CRUD entity: Posts — closest to future CMS app usage
- Realistic demo content (not Lorem ipsum) — per project principle
- Upsert-based idempotent seed — `npm run seed` safe to re-run anytime

### the agent's Discretion
- Exact UI layout, component structure, and file organization details
- Choice of shadcn/ui component set beyond the core (button, input, card, dialog, dropdown, table, form)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — this phase creates the template from scratch (empty project directory)

### Established Patterns
- None yet — this phase establishes the patterns all future phases inherit

### Integration Points
- Project root becomes the `nextjs-starter` template — Phase 1+ apps copy from it
- All future phases depend on: auth, `lib/db.ts`, `lib/mock/*`, seed script, UI components

</code_context>

<specifics>
## Specific Ideas

- No specific references beyond ROADMAP and requirements — accepted standard approaches from discussion tables

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>
