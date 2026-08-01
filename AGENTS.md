# AGENTS.md

## Project

`nextjs-starter` is a fullstack demo template for a portfolio of ~30 apps. Stack:
Next.js 16 (App Router, TypeScript, Tailwind v4, Turbopack), shadcn/ui, Neon
Postgres via raw SQL (`@neondatabase/serverless`), jose JWT sessions in an
httpOnly cookie, bcryptjs password hashing, Zod 4 validation, vitest.

## Hard conventions (template-wide — every future app inherits these)

- **proxy.ts, not middleware.ts** — Next 16 renamed the convention. The auth
  guard lives in `proxy.ts` (root) exporting `proxy()`. Never add
  `export const runtime` to it.
- **`export const dynamic = 'force-dynamic'`** on every DB-reading page/route
  handler — build-time static prerender of DB queries breaks builds.
- **Dual Neon URLs** — `DATABASE_URL` (pooled, `-pooler`) for the app;
  `DATABASE_URL_DIRECT` (no `-pooler`) for migrations/seed.
- **Server-only boundaries** — `lib/db.ts`, `lib/session.ts`, `lib/mock/*`
  start with `import "server-only"`. Client imports are build errors.
- **bcryptjs only in route handlers / seed** — never in proxy.ts or pages.
- **Raw SQL only** — neon template tags, never string-concatenated input.
- **Migrations** — idempotent `db/migrations/*.sql` files applied by
  `npm run seed` (tsx) with a `schema_migrations` ledger; upserts via
  `ON CONFLICT`; seed reports size and exits non-zero at >= 200 MB.
- **No ORM, no Prisma, no `ws` package** (Node 24 global WebSocket).

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` / `npm run lint` / `npx tsc --noEmit` — CI checks
- `npm run test` — vitest run
- `npm run seed` — migrations + demo data upserts (needs `.env.local`)

## Env contract

See `.env.example` — 9 vars: both DATABASE_URLs, SESSION_SECRET (>= 32 chars),
and 6 `MOCK_*` switches (`mock` default; `real` reserved for future apps).
Never commit real secrets; `.env.local` is gitignored.

## Template versioning

`TEMPLATE_VERSION` lives in `lib/site.ts`. Bump it when forking for a new app.
