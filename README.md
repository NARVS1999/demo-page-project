# ads-mediatech

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
| Storage | `upload({name, data})`, `getUrl(id)` | `MOCK_STORAGE` | `mock_uploads` | `mock` = metadata only (never the blob); `real` = uploads bytes to Vercel Blob |

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
2. Add the **9 environment variables** from `.env.example` (both Neon URLs, `SESSION_SECRET`, six `MOCK_*` switches). Never commit `.env.local`. For real image uploads, also set `MOCK_STORAGE=real` + `BLOB_READ_WRITE_TOKEN` (Vercel Blob store).
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

## Demo Guide (CMS phase)

The seeded demo account gives you the full CMS experience out of the box:

- **Demo credentials:** `demo@example.com` / `demo1234`

### Walkthrough

1. **Create a post** — sign in, open **Posts → New post**. Write in markdown; the preview pane on the right renders exactly what readers will see (both share one component map and one `.article-body` style set). The slug auto-derives from the title. Add a category, up to 8 tags, and a cover image.
2. **Save draft vs Publish** — drafts are visible only to you (in /posts); published posts appear on the public blog. Re-publishing is a single click.
3. **Browse the blog** — open **Blog** in the header (works logged out): Features grid, article pages with a drop cap, category kickers, tag chips, and related coverage. Filter by **category** and **tag** pages, and use **search** — title, body, category, and tag names match with ILIKE.
4. **Manage taxonomy** — under **Admin → Content**, create/rename/delete categories and tags. Deleting a category leaves its posts uncategorized; deleting a tag removes it from every post.
5. **Upload a cover** — the editor's cover upload posts to `/api/uploads` and stores a URL (max 3 MB, images only).

### Honest mocks

Upload URLs are **simulated** by default: `https://mock.storage/…` URLs never resolve — the editor shows a "Mock cover — URL only" placeholder, and public cards hide broken covers. Seeded posts use `picsum.photos` seeded URLs so the demo renders real photos immediately.

**Real uploads:** set `MOCK_STORAGE=real` and add a `BLOB_READ_WRITE_TOKEN` (Vercel Blob store) and the "Upload cover" button stores the actual image bytes and returns a real public URL that renders on the blog. You can also paste any image URL directly in the editor.

### Run it

```bash
npm run seed   # migrations + 5 posts, 4 categories, 7 tags (idempotent)
npm run dev
```

## Portfolio

All deployed demo apps sharing this template — one repo, one Vercel deployment, one Neon free-tier database each.

| Project | Live Demo | GitHub | Stack |
|---------|-----------|--------|-------|
| ads-mediatech | [nextjs-starter-narvs.vercel.app](https://nextjs-starter-narvs.vercel.app) | [NARVS1999/ads-mediatech](https://github.com/NARVS1999/nextjs-starter) | Next.js 16, TypeScript, Tailwind v4, Neon Postgres, shadcn/ui |
| CMS Demo | [cms-app-narvs.vercel.app](https://cms-app-narvs.vercel.app) | [NARVS1999/cms-app](https://github.com/NARVS1999/cms-app) | Next.js 16, TypeScript, Tailwind v4, Neon Postgres, shadcn/ui |
| Booking App | [booking-app-narvs.vercel.app](https://booking-app-narvs.vercel.app) | [NARVS1999/booking-app](https://github.com/NARVS1999/booking-app) | Next.js 16, TypeScript, Tailwind v4, Neon Postgres, shadcn/ui |
| Northstar Coffee | [ecommerce-app-narvs.vercel.app](https://ecommerce-app-narvs.vercel.app) | [NARVS1999/ecommerce-app](https://github.com/NARVS1999/ecommerce-app) | Next.js 16, TypeScript, Tailwind v4, Neon Postgres, shadcn/ui |

All projects share the same demo credentials: `demo@example.com` / `demo1234` (seeded by `npm run seed`). Each app simulates the external services listed on its card — no real payments, emails, or credit cards anywhere in the portfolio.

### Maintenance Checklist

- [ ] Verify all 4 live demo URLs resolve (no 404s) monthly
- [ ] Update `lib/projects.ts` when new apps are deployed
- [ ] Monitor Vercel invocation budget (< 1M/month account-wide, shared across all projects)
- [ ] Monitor Neon storage budget (< 0.5 GB per project)
- [ ] Re-run `npm run seed` after Neon cold-starts
- [ ] Bump `TEMPLATE_VERSION` in `lib/site.ts` when forking for a new app
