# nextjs-starter

**Fullstack demo template** — a battle-tested starting point for the portfolio's demo apps. Auth, mock services, and a reference CRUD app, deployable to Vercel + Neon at **$0**.

Template version: **0.1.0** (see `lib/site.ts` — **bump it when forking** this repo for a new app; it exists so template drift between the ~30 portfolio apps stays detectable).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Tailwind v4, Turbopack) |
| UI | shadcn/ui (Radix primitives) + lucide-react + next-themes |
| Database | Neon Postgres via raw SQL (`@neondatabase/serverless`) |
| Auth | jose JWT in an httpOnly cookie + bcryptjs password hashing |
| Validation | Zod 4 (env schema fails fast at startup; input schemas everywhere) |
| Testing | vitest (unit: schemas, session, mock services) |

Hard conventions every future app inherits are documented in `AGENTS.md` — `proxy.ts` (not `middleware.ts`), `force-dynamic` on DB-reading pages, dual Neon URLs, server-only boundaries, raw SQL only.

## Quick start

```bash
cp .env.example .env.local
# Fill the two Neon URLs (see "Neon" below) and:
#   openssl rand -base64 32   → SESSION_SECRET
npm install
npm run seed   # migrations + demo data (needs .env.local)
npm run dev    # http://localhost:3000
```

## Demo credentials

| Email | Password |
|---|---|
| demo@example.com | demo1234 |

Created by `npm run seed` along with three demo posts and a handful of mock email/SMS/payment events (visible under `/admin`).

## Mock services

All six import from `@/lib/mock` and mirror their real-provider API shapes. Swap to a real provider by replacing the file — never the call sites. Each service honors its `MOCK_*` env switch: `mock` (default) = this simulation; `real` = throws "not configured in Phase 0" (reserved for future apps).

| Service | Methods | Env switch | Persists to | Notes |
|---|---|---|---|---|
| Payment | `createPayment({amount, currency, fail?})`, `refund(id)` | `MOCK_PAYMENT` | `mock_payments` | `fail: true` returns `failed`; failures are persisted too |
| Email | `sendEmail({to, subject, text})` | `MOCK_EMAIL` | `mock_emails` | status `sent` |
| SMS | `sendSms({to, message})` | `MOCK_SMS` | `mock_sms` | status `delivered` |
| OAuth | `getAuthUrl()`, `exchangeCode(code)` | `MOCK_OAUTH` | — (stateless) | auto-logs-in the demo user |
| Maps | `geocode(address)`, `getStaticMapUrl({lat, lng})` | `MOCK_MAPS` | — (stateless) | deterministic pseudo-coords; no API keys |
| Storage | `upload({name, data})`, `getUrl(id)` | `MOCK_STORAGE` | `mock_uploads` | metadata only — never stores the blob |

## Deploy (GitHub → Vercel → Neon, $0)

### 1. Neon (database)

1. Create a project at [console.neon.tech](https://console.neon.tech) (free tier, 0.5 GB).
2. Open **Connect** and copy **two** strings:
   - **Connection pooling ON** (URL contains `-pooler`) → `DATABASE_URL`
   - **Connection pooling OFF** (no `-pooler`) → `DATABASE_URL_DIRECT`
3. Put both in `.env.local` (and in Vercel, below). One project per app.

### 2. GitHub

```bash
git remote add origin git@github.com:NARVS1999/nextjs-starter.git
git push -u origin main
```

(Push via the GitHub web UI works too — this template has no secrets in git history; `.env.local` is gitignored.)

### 3. Vercel

1. Import the repo in the Vercel dashboard (Hobby plan, no CLI needed).
2. Add the **9 environment variables** from `.env.example` (both Neon URLs, `SESSION_SECRET`, six `MOCK_*` switches). Never commit `.env.local`.
3. Push to `main` → auto-deploy. Done.

## Operations notes

- **Cold start:** the first visit after idle can take a few seconds while Neon wakes from cold storage. Subsequent visits are fast.
- **Invocation budget:** Vercel Hobby allows ~1M function invocations/month **account-wide** (shared across all projects). Fine for demos; keep demo traffic in mind.
- **Database budget:** Neon free tier is 0.5 GB per project. `npm run seed` reports total size and **exits non-zero at ≥ 200 MB** — a hard gate that keeps demo data from eating the budget.
- **Seed idempotency:** `npm run seed` is safe to re-run — migrations are tracked in a `schema_migrations` ledger and demo rows upsert by fixed IDs.

## Security posture

- Sessions are signed JWTs (jose, HS256) in an **httpOnly** cookie: `secure` in production, `SameSite=Lax`, 30-day expiry. The JWT is the source of truth — no session table.
- `proxy.ts` guards `/admin`, `/dashboard`, `/posts`, `/api/*` (public auth endpoints whitelisted); **every** page and server action re-verifies auth (the proxy is a convenience gate, not the boundary).
- Passwords: bcryptjs cost 10, **only in route handlers and seed** (never in the proxy or pages).
- Posts CRUD is ownership-scoped in SQL (`WHERE id = … AND author_id = …`) — cross-user edit/delete returns 404, not data.
- All input validated with Zod 4; all SQL via parameterized template tags (no string concatenation).
- CSRF: `SameSite=Lax` + proxy Origin check on state-changing `/api/*` requests.
- **Deferred (documented gap):** rate limiting on auth endpoints. Planned for a future app — the demo scale doesn't need it yet.

## Testing

```bash
npm run test
```

Unit-tested with vitest (no live DB — `lib/db` is stubbed): env/input Zod schemas (`__tests__/validate.test.ts`), JWT sign/verify round-trip + tamper/expiry (`__tests__/session.test.ts`), and all six mock service contracts (`__tests__/mock.test.ts`). Async Server Components are **not** unit-tested — vitest can't render them; their logic is kept thin and delegated to the tested modules. Full flows are verified manually in `npm run dev` (see the phase plan's manual checklist).
