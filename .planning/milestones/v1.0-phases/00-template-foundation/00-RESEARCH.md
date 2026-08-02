# Phase 0: Template Foundation — Research

**Researched:** 2026-08-02
**Domain:** Next.js 16 fullstack template foundation (App Router, Tailwind v4, shadcn/ui, Neon Postgres, jose/bcryptjs auth, mock services, seed tooling)
**Confidence:** HIGH (package versions verified against npm registry; setup patterns from official docs of Next.js 16.2.12, shadcn 4.16.1, Neon 1.1.0, jose 6.2.6, zod 4.4.3)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Signed JWT in httpOnly cookie with 30-day expiry — matches "session persisted via jose JWT" success criterion; stateless, zero extra schema needed
- Next.js middleware checks JWT for `/admin` and `/api/*` routes — single enforcement point, fast
- Login errors shown as inline field errors + redirect on success — standard shadcn form pattern
- Registration fields: email + name + password (Zod-validated, min 8 chars)
- Raw SQL via `@neondatabase/serverless` with typed helpers in `lib/db.ts` — no ORM (consistent with "no Prisma" decision)
- Idempotent SQL migration files in `db/migrations/` run by seed — versioned and replayable
- `neon()` for serverless edge queries + `Pool` for transactions — per TMPL-03
- Seed reports per-table row counts + `pg_database_size` total in MB — proves the <200 MB criterion
- Simplified interfaces matching real API shapes (payment, email, SMS, OAuth, maps, storage) — swappable later without touching business logic
- DB-backed simulation — mock events persisted to tables, viewable in admin
- `MOCK_*` env vars pick mock vs real provider — defaults to mock
- Optional `fail: true` param on mock payment — lets demos show error states
- `next-themes` with localStorage persistence + system default
- Sample CRUD entity: Posts — closest to future CMS app usage
- Realistic demo content (not Lorem ipsum) — per project principle
- Upsert-based idempotent seed — `npm run seed` safe to re-run anytime

### the agent's Discretion
- Exact UI layout, component structure, and file organization details
- Choice of shadcn/ui component set beyond the core (button, input, card, dialog, dropdown, table, form)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

## Summary

Phase 0 scaffolds the `ads-mediatech` template from an empty repo: Next.js 16.2.12 (App Router, TypeScript, Tailwind v4.3.3, shadcn/ui 4.16.1) with hand-rolled auth (jose 6.2.6 JWT in httpOnly cookie + bcryptjs 3.0.3), raw-SQL data layer on `@neondatabase/serverless` 1.1.0, 6 DB-backed mock services, an idempotent seed script with a <200 MB storage report, Zod 4 env validation, next-themes 0.4.6 dark mode, and a Posts CRUD reference. All locked decisions in CONTEXT.md were verified as current and executable with the following deltas found during research:

1. **Next.js 16 renamed `middleware.ts` → `proxy.ts`** (v16.0.0, deprecated with codemod). The auth guard must be `proxy.ts` exporting `proxy()`, which now **defaults to the Node.js runtime** — jose still works everywhere, but bcryptjs is now technically runnable in proxy yet must stay out of it for CPU reasons.
2. **No `ws` package needed** — Node 24.18.0 (installed) has a global WebSocket; prior research's `neonConfig.webSocketConstructor = ws` pattern is only needed on Node < 22.
3. **Two DB connection strings required**: pooled `-pooler` URL for runtime, direct URL for seed/migrations (Neon PgBouncer transaction mode; migrations must use direct per Neon docs).
4. **DB-reading pages are statically prerendered at build time** unless marked `export const dynamic = 'force-dynamic'` — without this, the Posts CRUD and dashboard break at build/deploy.
5. **shadcn 4.x init adds `@import "tw-animate-css"` and `@import "shadcn/tailwind.css"`** to globals.css beyond the UI-SPEC's listed scaffold — executor must accept these CLI additions while preserving the UI-SPEC's canonical token values.
6. **next-themes is 0.4.6** — there is no "next-themes v4"; the shadcn-documented pattern (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`, `suppressHydrationWarning`) is unchanged.

**Primary recommendation:** Follow the exact command sequences and file conventions in Topics 1–7 below. The plan should split scaffolding (plan 00-01) from infrastructure/UI (plan 00-02) as ROADMAP prescribes, with the proxy.ts rename, force-dynamic rule, and dual DATABASE_URL strategy treated as hard conventions — every one of the ~30 future apps inherits them.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Session issuance/verification (JWT sign/verify) | API / Backend (route handlers + server actions, Node runtime) | Proxy (edge-of-app guard) | bcrypt compare + JWT creation need Node runtime and DB access; proxy only verifies signatures (jose is runtime-agnostic) |
| Route guarding (/admin, /api/*) | Proxy | API / Backend (in-handler auth checks) | Single enforcement point per locked decision; but every handler re-verifies (Next.js data security guide) |
| Data access (raw SQL) | Database / Storage | API / Backend (DAL in `lib/`) | neon() HTTP queries executed from server components/route handlers/actions; server-only boundary |
| Transactions (BEGIN/COMMIT) | API / Backend (Pool per request) | — | Pool over WebSockets, created and closed inside the request/action |
| Mock services | API / Backend (`lib/mock/*`, server-only) | Database / Storage (event persistence tables) | Services are server-side modules; DB-backed simulation tables viewable in admin |
| Seed / migrations | CLI / script tier (`scripts/seed.ts` via tsx) | Database / Storage | Standalone Node script, direct connection, upsert idempotency |
| Input validation | API / Backend (zod in `lib/validate.ts`, re-validated server-side) | Browser / Client (react-hook-form + zodResolver for inline errors) | Client validation is UX; server validation is security |
| Env validation | API / Backend (startup, `lib/validate.ts` env schema) | — | Fail-fast at module load; clear errors per TMPL-10 |
| Theme state (dark/light) | Browser / Client | — | next-themes + localStorage + system default; server only needs `suppressHydrationWarning` |
| Forms (auth, posts) | Browser / Client (RHF + shadcn form) | API / Backend (server action re-validation) | UI-SPEC interaction contract |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TMPL-01 | Template with App Router, TS, Tailwind v4 | Topic 1 — verified create-next-app 16.2.12 + Tailwind 4.3.3 commands; proxy.ts convention |
| TMPL-02 | Auth: login/register/logout, jose JWT session | Topic 3 — jose 6.2.6 SignJWT/jwtVerify, cookie flags, proxy guard, CSRF posture |
| TMPL-03 | DB pool: neon() + Pool for transactions | Topic 2 — Neon driver 1.1.0 GA patterns, per-request Pool, dual connection strings |
| TMPL-04 | Mock services (6, matching real API shapes) | Topic 4 — interface contracts per mock, MOCK_* switches, DB-backed persistence tables |
| TMPL-05 | Seed script (npm run seed) | Topic 5 — tsx runner, migrations-first, upserts, size report + <200 MB gate |
| TMPL-06 | Dark/light theme toggle | Topic 1/7 — next-themes 0.4.6 + shadcn dark-mode pattern (verified) |
| TMPL-07 | Loading/error states for all pages | UI-SPEC pages contract; skeleton composition; route loading.tsx/error.tsx conventions |
| TMPL-08 | Sample CRUD (Posts) | Topics 2+3 — DB + auth patterns applied; revalidatePath after mutations; ownership check |
| TMPL-09 | Zod validation in lib/validate.ts | Topic 3/7 — zod 4.4.3 API (z.url, flattenError), schemas for register/login/post |
| TMPL-10 | Env validation on startup | Topic 7 — zod env schema pattern, fail-fast with readable errors |
| DEPL-01 | Own GitHub repo | Topic 7 — repo exists; add remote, no gh CLI needed (web UI) |
| DEPL-02 | Auto-deploy to Vercel on push | Topic 7 — Vercel Hobby import; dashboard import needs no vercel CLI |
| DEPL-03 | Neon DB per project | Topic 2/7 — direct + pooled strings, -pooler suffix, migrations on direct |
| DEPL-04 | Env vars in Vercel dashboard | Topic 7 — .env.example contents; never commit secrets |
| DEPL-05 | README with demo creds + mock docs | Topic 5/7 — demo@example.com/demo1234; mock service docs section |

## Topic 1 — Scaffolding: Next.js 16 + Tailwind v4 + shadcn/ui

### Verified command sequence (from official docs)

```bash
# 1. Scaffold in repo root (repo already git-initialized; .planning/ and PRD.md don't conflict)
npx create-next-app@latest . --yes
# --yes defaults: TypeScript, ESLint, Tailwind CSS, App Router, Turbopack, import alias @/*, AGENTS.md
# (if the non-empty dir prompt blocks, answer "yes" to continue; fallback: scaffold to temp dir and move)

# 2. Core runtime dependencies
npm install @neondatabase/serverless zod jose bcryptjs next-themes server-only

# 3. shadcn/ui init (existing project path — NOT -t next, which scaffolds a new project)
npx shadcn@latest init
# Answer prompts: base color = zinc, css variables = yes, RSC = yes (per UI-SPEC; base color is
# an interactive prompt in shadcn 4.x — no --base-color flag exists; -b/--base selects the
# component library base: radix is the default)

# 4. Components (official registry; per UI-SPEC Component Inventory)
npx shadcn@latest add button input label card form textarea select table badge alert dialog alert-dialog dropdown-menu avatar skeleton separator sonner sheet sidebar

# 5. Forms + toasts deps (shadcn form/sonner install these, but pin explicitly for template stability)
npm install react-hook-form @hookform/resolvers
```

### What shadcn init generates (verified from shadcn CLI docs)

- `components.json` at repo root; `lib/utils.ts` with the `cn()` util; `globals.css` rewritten
- **globals.css additions beyond the UI-SPEC list**: `@import "tailwindcss";` → also `@import "tw-animate-css";` and `@import "shadcn/tailwind.css";` (shared Tailwind v4 utilities: `data-open:`/`data-closed:` variants, accordion animations). The UI-SPEC scaffold list predates these imports — **accept CLI additions; apply UI-SPEC token values (indigo primary, radius 0.75rem, zinc neutrals) after init** (UI-SPEC "Token authority" clause).
- Tailwind v4 is CSS-first: **no `tailwind.config.js`**; `@custom-variant dark (&:is(.dark *));` enables class-based dark mode; tokens are oklch in `:root` / `.dark` blocks via `@theme inline`.
- Dark mode + theming: `npx shadcn@latest add` components are theme-ready (use `bg-background` etc.).

### Theme provider (verified shadcn dark-mode/next docs — exact pattern)

```tsx
// components/theme-provider.tsx  ("use client")
import { ThemeProvider as NextThemesProvider } from "next-themes"
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

```tsx
// app/layout.tsx
<html lang="en" suppressHydrationWarning>
  <body>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  </body>
</html>
```

### Gotchas

- **`middleware.ts` is deprecated in Next 16 — the file is `proxy.ts` exporting `proxy()`.** Codemod: `npx @next/codemod@canary middleware-to-proxy .`. The `runtime` config export is **forbidden** in proxy files (throws) — proxy defaults to Node.js runtime.
- **next-themes is 0.4.6** (npm dist-tag latest; no v4 exists). `suppressHydrationWarning` goes on `<html>` only.
- `next build` **no longer runs ESLint** in Next 16 — run `npm run lint` (script is `eslint`) as a separate check.
- create-next-app prompts include React Compiler (recommend **No** for template stability) and AGENTS.md (keep **Yes** — it ships with the template to guide agents in future apps).
- TypeScript: registry latest is 7.0.2, but let create-next-app pin its supported version (Next requires ≥5.1; do not manually bump to 7).
- Turbopack is the default bundler (`next dev`); no config needed.

## Topic 2 — Database layer: Neon serverless driver (verified from neon.tech docs)

### Driver choice (locked: raw SQL, no ORM)

- `@neondatabase/serverless@1.1.0` — GA (v1.0.0+ requires Node ≥19; we have Node 24). Types bundled; zero additional type packages.
- **`neon()` over HTTP** — one-shot queries, lowest latency, safe template tags; 64 MB request/response limit; supports `sql.transaction([...])` for non-interactive multi-query transactions (with `isolationLevel`, `readOnly` options).
- **`Pool`/`Client` over WebSockets** — node-postgres-compatible API for interactive transactions (BEGIN/COMMIT/ROLLBACK).
- **No `ws` package required**: Node 24 has a global WebSocket (verified locally: `typeof WebSocket === 'function'`). The `neonConfig.webSocketConstructor = ws` pattern from prior research applies only to Node < 22 / Node.js without built-in WebSocket.
- **Serverless rule (from Neon docs):** Pool/Client objects must be created, used, and closed **within a single request handler** — never at module scope in serverless. `neon()` HTTP (stateless) *is* safe at module scope.

### Connection strings (verified from Neon connection-pooling docs)

```
# Runtime (serverless functions, web app) — pooled:
DATABASE_URL=postgresql://user:pass@ep-XXXX-pooler.us-east-2.aws.neon.tech/dbname?sslmode=require
# Seed + migrations — direct (no -pooler suffix):
DATABASE_URL_DIRECT=postgresql://user:pass@ep-XXXX.us-east-2.aws.neon.tech/dbname?sslmode=require
```

- Pooled = PgBouncer transaction mode: **no `SET`/`RESET`, `LISTEN`/`NOTIFY`, SQL-level `PREPARE`** — irrelevant for our query style, but migrations are recommended on **direct** per Neon docs (migration tools rely on session features; our own runner uses simple DDL so pooled mostly works — direct is the documented-safe choice).
- Free tier: 0.25 CU → 104 `max_connections` (97 usable); transient-drop retry logic recommended (HTTP driver: retry with backoff).

### Recommended `lib/db.ts` shape

```ts
// lib/db.ts — server-only (import 'server-only')
import { neon, neonConfig } from "@neondatabase/serverless";
// Node 24: global WebSocket available — neonConfig.webSocketConstructor not needed

export const sql = neon(process.env.DATABASE_URL!);          // one-shot queries (module-safe)
export const sqlDirect = neon(process.env.DATABASE_URL_DIRECT!); // migrations/seed only

// Transactions: create + close a Pool per operation (serverless-safe)
export async function withPool<T>(fn: (client: import("@neondatabase/serverless").PoolClient) => Promise<T>): Promise<T> {
  const { Pool } = await import("@neondatabase/serverless");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  try {
    const client = await pool.connect();
    try { await client.query("BEGIN"); const r = await fn(client); await client.query("COMMIT"); return r; }
    catch (e) { await client.query("ROLLBACK"); throw e; }
    finally { client.release(); }
  } finally { await pool.end(); }
}
```

### Critical gotchas

- **Static prerender trap (verified from Neon Next.js guide):** server components and GET route handlers that query the DB get statically rendered at build time — the query runs during `next build` (fails without DB, or serves stale data). Add `export const dynamic = 'force-dynamic'` to every DB-reading page and GET route handler in the template.
- Never import `lib/db.ts` from a client component — the `server-only` package makes this a build error.
- Tagged templates (`sql\`...\``) and `sql.query(sql, params)` are injection-safe; never string-concatenate user input into SQL.

## Topic 3 — Auth: jose + bcryptjs in App Router (verified)

### The pattern (matches locked decisions; stateless JWT, no sessions table)

| Concern | Where | Runtime | Why |
|---------|-------|---------|-----|
| Password hash/compare | POST /api/auth/login, /api/auth/register route handlers | Node (default) | bcryptjs is CPU-bound (~60–100 ms/compare); proxy runs per-request on every matched route |
| JWT sign (login/register) | route handler / server action | Node | jose works everywhere, but signing happens once per login |
| JWT verify (guard) | `proxy.ts` | Node (Next 16 default) or edge | jose 6.x is runtime-agnostic (WebCrypto); ~0.1 ms |
| Session read (server components) | DAL `getCurrentUser()` with `cache()` | Node | react `cache()` dedupes per-request |
| Cookie write | route handler response / server action `cookies().set()` | Node | Next.js blocks cookie mutations in render methods |

**bcryptjs runtime fact (verified from README):** pure JS, zero deps, works in Node and browsers (WebCrypto). It *can* run in proxy, but doing so burns CPU on every request — the locked decision (verify-only in proxy, bcrypt in route handlers) is the correct pattern. **72-byte input limit** — enforce `password: z.string().min(8).max(72)` in the register schema and check `bcrypt.truncates()` where relevant.

**jose (verified from README):** zero dependencies; universal ESM; supported runtimes: Node, browsers, Cloudflare Workers, Deno, Bun, Electron; v6.x is the maintained line.

```ts
// lib/session.ts — server-only
import { SignJWT, jwtVerify } from "jose";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);

export async function createSession(user: { id: string; email: string; name: string }) {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}
export async function verifySession(token: string | undefined) {
  if (!token) return null;
  try { const { payload } = await jwtVerify(token, secret); return payload; }
  catch { return null; } // expired or tampered → treat as logged out
}
```

### proxy.ts (Next 16 replacement for middleware.ts — verified from Next.js docs)

```ts
// proxy.ts — project root
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get("session")?.value);

  if (pathname.startsWith("/api")) {
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next(); // note: auth APIs (login/register) must be excluded via matcher
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
    if (!session) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
  }
  return NextResponse.next();
}
export const config = { matcher: ["/api/:path*", "/admin/:path*", "/dashboard/:path*"] };
```

**Critical matcher detail:** `/api/:path*` must **exclude public auth endpoints** (`/api/auth/login`, `/api/auth/register`) — use a second matcher entry with `missing`/negative lookahead, or a whitelist check inside proxy (e.g., `if (pathname === "/api/auth/login" || pathname === "/api/auth/register") return NextResponse.next()`).

### Cookie contract

`session` cookie: `httpOnly`, `secure` (production), `sameSite: "lax"`, `path: "/"`, `maxAge: 60*60*24*30`. SameSite=Lax is the baseline CSRF defense; Server Actions additionally compare Origin vs Host and abort on mismatch (built-in, verified). For fetch-based mutations to `/api/*` (Phase 0 uses server actions per UI-SPEC, but the template should be safe for future apps): **add an Origin/Referer check for POST/PUT/DELETE in proxy** — 5 lines, prevents cross-site form posts.

### Defense in depth (verified from Next.js data security guide)

- **Verify auth inside every route handler and server action** — a page-level check does not extend to actions defined on it. Proxy is a convenience gate, not the security boundary.
- DAL pattern: `getCurrentUser = cache(async () => { const s = await verifySession((await cookies()).get("session")?.value); ... })` in a `server-only` module; return minimal DTOs.
- `cookies()` is async in Next 15+/16: `const cookieStore = await cookies()`.
- Session expiry flow: expired JWT → verify returns null → proxy redirects `/login?next=…` (UI-SPEC session-expired contract).

## Topic 4 — Mock services layer (locked: lib/mock/*, DB-backed, MOCK_* switches)

### Interface contracts (each matches its real-service API shape — Pitfall 5 prevention)

| Service | Real API shape it mirrors | Mock methods | Persistence table |
|---------|---------------------------|--------------|-------------------|
| `payment.ts` | Stripe-like checkout | `createPayment({ amount, currency, fail? }) → { id, status: "succeeded"\|"failed", amount }`, `refund(id)` | `mock_payments` |
| `email.ts` | SendGrid-like | `sendEmail({ to, subject, text }) → { id, status: "sent" }` | `mock_emails` |
| `sms.ts` | Twilio-like | `sendSms({ to, message }) → { id, status: "delivered" }` | `mock_sms` |
| `oauth.ts` | Google OAuth-like | `getAuthUrl()`, `exchangeCode(code) → { user: { email, name }, accessToken }` (auto-login demo user) | `mock_oauth_attempts` (optional) |
| `maps.ts` | Google Maps-like | `geocode(address) → { lat, lng, formattedAddress }`, `getStaticMapUrl({ lat, lng })` (picsum/static URL, no real key) | — (stateless) |
| `storage.ts` | S3/Vercel Blob-like | `upload({ name, data }) → { url, size }` (base64 or URL), `getUrl(id)` | `mock_uploads` (metadata only, never blobs — Pitfall 9) |

### Rules (from CONTEXT.md + prior research)

- `lib/mock/index.ts` exports all six; business logic imports from `@/lib/mock` only — swapping to a real provider replaces the file, never the call sites.
- `MOCK_*` env switches: `MOCK_PAYMENT`, `MOCK_EMAIL`, `MOCK_SMS`, `MOCK_OAUTH`, `MOCK_MAPS`, `MOCK_STORAGE` — value `"mock"` (default) vs `"real"`; the mock implementation is selected inside each module.
- Payment `fail: true` param (locked) → returns `status: "failed"` and persists the failed event.
- Every mock file header: `// MOCK: Replace with real <Service>. Interface must match <RealService>.createX() signature.`
- Keep each mock < ~100 lines (Pitfall 5: mock over-engineering). DB writes go through `lib/db.ts` `sql` template tags.
- Persistence tables come from migrations (Topic 5) and are viewable in admin (`/admin/emails`, `/admin/sms` per UI-SPEC).

## Topic 5 — Seed script architecture

```jsonc
// package.json scripts
"seed": "tsx scripts/seed.ts",
```

- **Runner:** `tsx@4.23.1` (verified) — runs TS directly. Seed is a standalone Node script: **Next.js does not load `.env.local` for scripts** — call `process.loadEnvFile(".env.local")` at the top of `scripts/seed.ts` (Node ≥20.12 API; Node 24 verified) or pass `--env-file=.env.local` to tsx.
- **Order:** (1) load env → (2) run migrations → (3) upsert demo data → (4) report.
- **Migrations:** `db/migrations/*.sql` executed in filename order via `sqlDirect` (direct connection). Idempotent SQL: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... IF NOT EXISTS` / guarded `ADD COLUMN IF NOT EXISTS`. Track applied migrations in a `schema_migrations(version)` table (INSERT ... ON CONFLICT DO NOTHING + skip already-applied) — replayable and versioned per locked decision. Tables: `users`, `posts`, `mock_emails`, `mock_sms`, `mock_payments`, `mock_uploads` (+ `schema_migrations`).
- **Upserts (idempotent):** `INSERT INTO users (email, name, password_hash) VALUES ($1,$2,$3) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name` — safe to re-run; passwords re-hashed on re-run only when changed. Post rows: `ON CONFLICT (id) DO UPDATE` with fixed UUIDs (`gen_random_uuid()` is built-in PG13+; no uuid package needed).
- **Demo data (realistic, per UI-SPEC):** demo user `demo@example.com` / password `demo1234` (bcrypt-hashed via bcryptjs in the seed — bcryptjs runs fine in Node scripts); 3 posts: template guide, mock-services explainer, deployment walkthrough; a handful of mock email/SMS/payment events for the admin views.
- **Report (success criterion 2):**
  ```sql
  SELECT pg_size_pretty(pg_database_size(current_database()));  -- total size
  -- per-table: SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY relname;
  ```
  Print a per-table row-count table, total size in MB, and **exit non-zero if ≥ 200 MB** (hard gate; 0.5 GB free tier with 40% headroom per Pitfall 3).

## Topic 6 — Testing strategy (tdd_mode: true)

### Verified setup (Next.js official Vitest guide, v16.2.12)

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
```

```ts
// vitest.config.mts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: { environment: 'jsdom' },
})
```

- Script: `"test": "vitest run"` (CI-friendly; `vitest` alone watches).
- **Constraint (verified): Vitest does NOT support async Server Components** — keep async SCs thin (delegate to DAL), test them via E2E later, or test only their synchronous helpers.
- **No live DB in unit tests:** `vi.mock("@/lib/db", ...)` to stub `sql` with a fake array-returning fn (the neon query function is just an async function — trivially mockable), or design `lib/db.ts` exports to be injectable. Session helpers test against an in-memory fake secret. Env validation tests mutate `process.env` in `beforeEach`/`afterEach`.
- **High-value unit targets without a DB:** zod schemas (register/login/post), env schema (missing var → clear error message), `lib/session.ts` (sign → verify round-trip, expired token → null), mock service logic with stubbed `sql`, `proxy.ts` matcher/redirect logic via `unstable_doesProxyMatch` from `next/experimental/testing/server` (experimental per Next docs), client components (forms render + inline errors via RTL).
- Test files: `__tests__/` or colocated `*.test.ts(x)`; plan Wave 0 files: `vitest.config.mts`, `lib/validate.test.ts`, `lib/session.test.ts`, one RTL smoke test.

## Topic 7 — Deployment: Vercel Hobby + Neon free tier

### .env.example (canonical contents)

```
# Neon — get both from Console → Connect (toggle "Connection pooling")
DATABASE_URL=postgresql://user:pass@ep-XXXX-pooler.us-east-2.aws.neon.tech/dbname?sslmode=require
DATABASE_URL_DIRECT=postgresql://user:pass@ep-XXXX.us-east-2.aws.neon.tech/dbname?sslmode=require
# Auth — generate with: openssl rand -base64 32
SESSION_SECRET=replace-with-32+byte-secret
# Mock switches (default mock; "real" unsupported in Phase 0 — reserved for future)
MOCK_PAYMENT=mock
MOCK_EMAIL=mock
MOCK_SMS=mock
MOCK_OAUTH=mock
MOCK_MAPS=mock
MOCK_STORAGE=mock
```

- **Vercel Hobby:** import the GitHub repo in the Vercel dashboard (no CLI required; `vercel` CLI is NOT installed — install `npm i -g vercel` only if CLI-driven deploys are wanted), paste the 9 env vars, deploy. Auto-deploys on git push thereafter (DEPL-02). No `NEXT_PUBLIC_*` vars needed in Phase 0.
- **Neon:** create one project per app (DEPL-03); the dashboard `Connect` modal provides both strings; pooled toggle is on by default for new projects. No `neonctl` installed — console-only workflow, fine.
- **README (DEPL-05):** demo credentials (`demo@example.com` / `demo1234`), cold-start note ("first visit may take a few seconds while the DB wakes"), mock service docs table, invocation-budget note (account-wide 1M/mo — Pitfall 1).
- **GitHub (DEPL-01):** repo exists with commits; create `ads-mediatech` repo on GitHub via web UI and `git remote add origin git@github.com:NARVS1999/nextjs-starter.git && git push -u origin main` (gh CLI not installed — web UI works).
- **Never commit `.env.local`** — `.env.example` only; `.gitignore` from create-next-app already covers it.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.12 | App Router framework | Locked; Turbopack default; proxy.ts convention |
| react / react-dom | 19.2.8 | UI runtime | Required by Next 16 |
| typescript | CNA-pinned (≥5.1; registry 7.0.2 — do not force) | Types | Locked |
| tailwindcss + @tailwindcss/postcss | 4.3.3 | CSS | v4 CSS-first, oklch tokens, `@custom-variant dark` |
| shadcn (CLI) | 4.16.1 | Component source scaffolding | Locked; official registry; Radix base |
| @neondatabase/serverless | 1.1.0 | Postgres driver (HTTP + WebSocket) | Locked; GA; edge/serverless-safe |
| zod | 4.4.3 | Validation (input + env) | Locked; v4 stable; type inference |
| jose | 6.2.6 | JWT sign/verify | Locked; zero deps; universal runtime |
| bcryptjs | 3.0.3 | Password hashing | Locked; pure JS; no native bindings (Vercel-safe) |
| next-themes | 0.4.6 | Dark/light theming | Locked; shadcn-documented pattern |
| lucide-react | 1.28.0 | Icons | shadcn default |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form + @hookform/resolvers | 7.84.0 / 5.6.0 | Forms + zod resolver | Auth + post forms (UI-SPEC) |
| sonner | 2.0.7 | Success toasts | shadcn `sonner` component dependency |
| server-only | 0.0.1 | Server boundary enforcement | Top of lib/db.ts, lib/session.ts, lib/mock/* |
| tsx | 4.23.1 | TS script runner | `npm run seed` |
| clsx / tailwind-merge / class-variance-authority | 2.1.1 / 3.6.0 / 0.7.1 | cn() util + variants | Installed by shadcn init |
| vitest + @vitejs/plugin-react + jsdom + @testing-library/react + @testing-library/dom + vite-tsconfig-paths | 4.1.10 / (latest) | Unit tests | tdd_mode |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @neondatabase/serverless | pg (direct TCP) | pg fails on serverless/edge; no TCP on Vercel |
| @neondatabase/serverless + raw SQL | Prisma / Drizzle | Locked "no ORM"; 3–8 table schemas read fine as SQL; saves bundle + migration tooling |
| jose | jsonwebtoken | jsonwebtoken unmaintained (known CVEs); jose is the NextAuth-internal standard |
| bcryptjs | argon2 / bcrypt (native) | Native bindings break on Vercel Hobby; bcryptjs ~30% slower — irrelevant at demo scale |
| next-themes | custom ThemeProvider + localStorage | Next-themes is the shadcn-blessed path; avoids hydration flash bugs |
| server actions (UI-SPEC mutations) | Route Handlers for everything | Locked UI-SPEC uses server actions for mutations; Route Handlers for auth + future APIs |
| uuid package | `gen_random_uuid()` / `crypto.randomUUID()` | Postgres built-in; zero deps |

**Installation (consolidated):**
```bash
npm install @neondatabase/serverless zod jose bcryptjs next-themes server-only react-hook-form @hookform/resolvers
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths tsx
```

**Version verification:** all versions above confirmed via `npm view <pkg> version` on 2026-08-02 (registry state matches prior research STACK.md).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| next | npm | 10+ yrs | 54.9M/wk | github.com/vercel/next.js | OK* | Approved |
| react | npm | 13+ yrs | 161.7M/wk | github.com/react/react | OK* | Approved |
| tailwindcss | npm | 6+ yrs | 117.2M/wk | github.com/tailwindlabs/tailwindcss | OK* | Approved |
| @neondatabase/serverless | npm | 3+ yrs | 3.0M/wk | github.com/neondatabase/serverless | OK | Approved |
| zod | npm | 6+ yrs | 247.7M/wk | github.com/colinhacks/zod | OK | Approved |
| jose | npm | 8+ yrs | 109.7M/wk | github.com/panva/jose | OK* | Approved |
| bcryptjs | npm | 9+ yrs | 12.5M/wk | github.com/dcodeIO/bcrypt.js | OK | Approved |
| next-themes | npm | 5+ yrs | 26.1M/wk | github.com/pacocoursey/next-themes | OK | Approved |
| lucide-react | npm | 3+ yrs | 81.8M/wk | github.com/lucide-icons/lucide | OK* | Approved |
| shadcn (CLI) | npm | 2+ yrs | 7.3M/wk | github.com/shadcn-ui/ui | OK* | Approved |
| react-hook-form | npm | 6+ yrs | 57.3M/wk | github.com/react-hook-form/react-hook-form | OK* | Approved |
| @hookform/resolvers | npm | 5+ yrs | 43.8M/wk | github.com/react-hook-form/resolvers | OK* | Approved |
| sonner | npm | 2+ yrs | 43.6M/wk | github.com/emilkowalski/sonner | OK | Approved |
| tsx | npm | 3+ yrs | 82.9M/wk | github.com/privatenumber/tsx | OK* | Approved |
| vitest | npm | 4+ yrs | 86.3M/wk | github.com/vitest-dev/vitest | OK* | Approved |
| ws | npm | 13+ yrs | 246.0M/wk | github.com/websockets/ws | OK* | **NOT INSTALLED** — Node 24 global WebSocket (not needed) |
| server-only | npm | 3+ yrs | 10.6M/wk | (official React marker pkg, no repo) | OK* | Approved |
| @tailwindcss/postcss | npm | 2+ yrs | 31.4M/wk | github.com/tailwindlabs/tailwindcss | OK* | Approved |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none actionable. *Marked entries returned `SUS` solely from the "too-new" heuristic (recent publish date of the latest minor release). All are long-established (2–13 yrs), carry 3M–248M weekly downloads, point at the canonical upstream repos, and have no postinstall scripts — cross-verified against official docs in this research; approved.* `ws` was intentionally dropped (global WebSocket in Node 24) — do not install.

## Architecture Patterns

### System Architecture Diagram

```
Browser (React, RSC-first)
  │  HTML/JSON                              │ fetch / server actions
  ▼                                          ▼
Proxy (proxy.ts — Next 16 guard)  ── jose jwtVerify ──► 401 / redirect /login?next=
  │                                          │
  ├─ pages: app/(auth), app/posts, app/admin… (Server Components, force-dynamic)
  │    └─ DAL: lib/session.ts getCurrentUser()  (react cache(), server-only)
  │         └─ lib/db.ts sql (neon HTTP, one-shot)
  ├─ mutations: server actions (posts CRUD, auth)  → revalidatePath
  │    └─ withPool() BEGIN/COMMIT (transactions)
  └─ lib/mock/* (payment, email, sms, oauth, maps, storage)
       └─ persist events → mock_* tables (viewable in /admin)
Neon Postgres (pooled -pooler URL at runtime; direct URL in seed)
scripts/seed.ts (tsx) → migrations (direct) → upserts → size report (<200 MB gate)
```

### Recommended Project Structure

```
ads-mediatech/
├── proxy.ts                      # Next 16 auth guard (NOT middleware.ts)
├── app/
│   ├── layout.tsx                # root: ThemeProvider, site-header, Toaster, footer
│   ├── page.tsx                  # landing
│   ├── (auth)/login/ register/   # auth route group (no site header)
│   ├── dashboard/  posts/  posts/[id]/edit/  admin/  admin/emails/  admin/sms/
│   ├── loading.tsx  error.tsx  not-found.tsx
│   └── api/auth/login/ register/ logout/     # route handlers
├── components/                   # theme-provider, theme-toggle, layout/*, ui/*, posts/*, auth/*
├── lib/
│   ├── db.ts  session.ts  validate.ts  site.ts   # all server-only except validate/site
│   └── mock/ payment.ts email.ts sms.ts oauth.ts maps.ts storage.ts index.ts
├── db/migrations/                # 001_init.sql, 002_*.sql … (idempotent)
├── scripts/seed.ts
├── __tests__/                    # vitest unit tests
├── .env.example   .env.local(gitignored)
└── README.md                     # DEPL-05: creds, mocks, cold-start, budget
```

### Pattern 1: Data Access Layer with react cache (verified from Next.js data security guide)
**What:** server-only module exposing `getCurrentUser = cache(...)`; all auth reads go through it; returns minimal DTOs.
**When:** every server component/action needing the session.
```ts
// lib/session.ts (server-only)
import { cache } from "react";
import { cookies } from "next/headers";
export const getCurrentUser = cache(async () => {
  const s = await verifySession((await cookies()).get("session")?.value);
  if (!s) return null;
  return { id: s.sub!, email: s.email as string, name: s.name as string };
});
```

### Pattern 2: Mock provider interface (locked)
**What:** each mock exports typed methods mirroring the real service; internal selection via `MOCK_*` env; events persisted via `sql`.
**When:** any external service integration in any future app.
```ts
// lib/mock/payment.ts
export interface PaymentResult { id: string; status: "succeeded" | "failed"; amount: number; currency: string; }
export async function createPayment(p: { amount: number; currency: string; fail?: boolean }): Promise<PaymentResult> { … }
// persist to mock_payments; fail:true → status "failed"
```

### Pattern 3: Idempotent migrations + upsert seed (locked)
**What:** migrations as versioned .sql files applied in order with a `schema_migrations` ledger; seed upserts via `ON CONFLICT`.
**When:** every app's schema + demo data.

### Pattern 4: Server-first components (prior research Pitfall 7)
**What:** no `'use client'` unless interactivity requires it (useState/useEffect/browser APIs); data fetching in SCs/actions; `server-only` on lib modules.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | custom KDF | bcryptjs (locked) | Adaptive, salted, pure JS; hand-rolled crypto is indefensible |
| JWT sign/verify | HMAC by hand | jose (locked) | RFC-compliant, audited, zero deps, edge-safe |
| DB driver/connection | fetch to PG wire | @neondatabase/serverless | HTTP + WebSocket; serverless-safe; injection-safe template tags |
| Form state/validation | manual onChange state | react-hook-form + zodResolver | RHF handles dirty/pending/errors; zod single-source schemas |
| Toasts | custom toast stack | sonner (via shadcn) | A11y, theming, positioning done |
| Theme | custom context | next-themes | Hydration-flash handling, system detection, storage sync |
| Env parsing | `process.env.X` everywhere | zod env schema in lib/validate.ts | Typed, validated, fail-fast with clear errors |
| IDs | uuid package | `gen_random_uuid()` (PG) / `crypto.randomUUID()` | Built-in, zero deps |
| Date formatting | date-fns | `Intl.DateTimeFormat` | Table dates ("Aug 2, 2026") are one call; no dep |

**Key insight:** every hand-rolled item on this list is a place where a future app in the 30-project portfolio will diverge from the template (Pitfall 4). The template's job is to lock these to the blessed library so copying the template copies the correct implementation.

## Common Pitfalls

### Pitfall 1: `middleware.ts` in a Next 16 app
**What goes wrong:** build errors or deprecation warnings; guard silently not running (if the file is ignored).
**Why:** Next 16.0.0 deprecated the convention and renamed it to `proxy.ts` (function name `proxy`).
**How to avoid:** create `proxy.ts` at root; codemod `npx @next/codemod@canary middleware-to-proxy .` if a `middleware.ts` exists.
**Warning signs:** terminal deprecation notice; `export const runtime` throws in the file.

### Pitfall 2: DB pages statically prerendered
**What goes wrong:** `next build` queries the DB at build time (fails without DATABASE_URL) or pages serve stale data.
**Why:** server components and GET route handlers default to static rendering.
**How to avoid:** `export const dynamic = 'force-dynamic'` on every DB-reading page/route (template-wide rule).
**Warning signs:** build-time DB errors; dashboard shows seeded data that never updates.

### Pitfall 3: bcrypt in proxy / module-scope Pool
**What goes wrong:** every proxied request spends ~100 ms hashing; Pool created at module scope leaks connections in serverless.
**Why:** proxy runs on every matched request; serverless instances can't hold WebSockets across requests.
**How to avoid:** bcrypt only in route handlers/actions; Pool created per transaction via `withPool()`; `neon()` (HTTP) for one-shot queries.
**Warning signs:** high function duration on guarded routes; "too many connections" on Neon.

### Pitfall 4: Seed doesn't see env vars
**What goes wrong:** seed crashes with `process.env.DATABASE_URL` undefined.
**Why:** Next.js loads `.env.local` only for the app, not standalone tsx scripts.
**How to avoid:** `process.loadEnvFile(".env.local")` (guarded by fs.existsSync) at the top of `scripts/seed.ts`.
**Warning signs:** seed works in IDE with env injected but fails via `npm run seed`.

### Pitfall 5: shadcn init overwrites custom globals.css tokens
**What goes wrong:** indigo primary/radius 0.75rem lost if init runs after manual theming.
**Why:** init rewrites globals.css.
**How to avoid:** run shadcn init FIRST, then apply UI-SPEC token values (Token authority clause); or re-apply tokens after init and diff.
**Warning signs:** tokens in UI-SPEC differ from generated CSS.

### Pitfall 6: Zod 3 habits on Zod 4
**What goes wrong:** `z.string().url()` and `error.flatten()` fail to type-check.
**Why:** zod 4 renamed both (`z.url()`, `.flattenError()`); `z.infer` unchanged.
**How to avoid:** use zod 4 APIs; `schema.safeParse` + `error.flattenError()` for messages; require `strict: true` tsconfig.
**Warning signs:** TS errors on `.flatten()`; deprecation JSDoc on `z.string().url()`.

### Pitfall 7: Hydration flash on theme
**What goes wrong:** white flash on load / theme flicker on switch.
**Why:** next-themes without `suppressHydrationWarning` + `attribute="class"`; missing `disableTransitionOnChange`.
**How to avoid:** shadcn dark-mode pattern verbatim (Topic 1); `suppressHydrationWarning` on `<html>` only.
**Warning signs:** `extra attributes from the server` in console.

### Pitfall 8: bcrypt 72-byte truncation
**What goes wrong:** long passwords silently compare as truncated → "wrong password" for valid input, or two different long passwords collide.
**Why:** bcrypt truncates input at 72 bytes.
**How to avoid:** `z.string().min(8).max(72)` on register/login password schemas.
**Warning signs:** login fails only for very long passwords.

### Pitfall 9: Seed > 200 MB or non-idempotent
**What goes wrong:** re-running seed duplicates rows; storage approaches 0.5 GB limit.
**Why:** plain INSERTs; no size gate.
**How to avoid:** ON CONFLICT upserts; per-table counts + `pg_database_size` report; exit(1) ≥ 200 MB.
**Warning signs:** `npm run seed` twice → doubled rows; Neon dashboard storage creeping up.

## Code Examples

### proxy.ts guard (verified pattern from Next.js proxy docs + jose)
```ts
// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // public auth endpoints — no auth required (must be checked BEFORE the API guard)
  if (pathname === "/api/auth/login" || pathname === "/api/auth/register") {
    return NextResponse.next();
  }
  const session = await verifySession(request.cookies.get("session")?.value);
  if (!session) {
    if (pathname.startsWith("/api")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard") || pathname.startsWith("/posts")) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}
export const config = { matcher: ["/api/:path*", "/admin/:path*", "/dashboard/:path*", "/posts/:path*"] };
```

### Session sign/verify (jose — from jose README patterns)
```ts
// lib/session.ts (server-only)
import { SignJWT, jwtVerify } from "jose";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);
export async function createSession(user: { id: string; email: string; name: string }) {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" }).setSubject(user.id)
    .setIssuedAt().setExpirationTime("30d").sign(secret);
}
export async function verifySession(token: string | undefined) {
  if (!token) return null;
  try { return (await jwtVerify(token, secret)).payload; } catch { return null; }
}
```

### neon() query + transaction (verified from Neon serverless driver docs)
```ts
// lib/db.ts (server-only)
import { neon } from "@neondatabase/serverless";
export const sql = neon(process.env.DATABASE_URL!);
export const sqlDirect = neon(process.env.DATABASE_URL_DIRECT!);

// one-shot: const posts = await sql`SELECT * FROM posts ORDER BY created_at DESC`;
// multi-statement non-interactive:
// const [emails, sms] = await sql.transaction([sql`SELECT * FROM mock_emails`, sql`SELECT * FROM mock_sms`], { readOnly: true });
// interactive txn via withPool(): BEGIN/COMMIT/ROLLBACK per Topic 2.
```

### Zod env validation (zod 4)
```ts
// lib/validate.ts
import { z } from "zod";
export const envSchema = z.object({
  DATABASE_URL: z.url(),
  DATABASE_URL_DIRECT: z.url(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  MOCK_PAYMENT: z.enum(["mock", "real"]).default("mock"),
  MOCK_EMAIL: z.enum(["mock", "real"]).default("mock"),
  // … remaining MOCK_* with defaults
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:\n" + formatEnvErrors(parsed.error.flattenError().fieldErrors));
  process.exit(1);
}
export const env = parsed.data;
// TMPL-10: imported by lib/db.ts + lib/session.ts + lib/mock/* (import 'server-only' boundary)
```

### Idempotent seed upsert
```sql
-- db/migrations/001_init.sql (idempotent)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```
```ts
// scripts/seed.ts
await sqlDirect`INSERT INTO users (email, name, password_hash)
  VALUES (${DEMO_EMAIL}, ${DEMO_NAME}, ${await bcrypt.hash(DEMO_PASSWORD, 10)})
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`;
```

### Theme toggle + provider (verified from shadcn dark-mode/next docs)
```tsx
// components/theme-toggle.tsx — DropdownMenu with Sun/Moon/Monitor; trigger Button variant="ghost" size="icon" aria-label="Toggle theme"; uses useTheme() from next-themes; active option checked.
```

### Vitest config + stub pattern
```ts
// vitest.config.mts — per Next.js guide (Topic 6)
// test example:
import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/db", () => ({ sql: vi.fn(async () => []) }));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` (edge runtime) | `proxy.ts` (Node runtime default) | Next 16.0.0 (2026) | Auth guard file name + function name; `runtime` export now forbidden |
| Tailwind v3 `tailwind.config.js` + `darkMode: "class"` | Tailwind v4 CSS-first `@custom-variant dark` + oklch `@theme inline` | Tailwind 4.0 (Jan 2025) | No JS config; dark mode via custom variant |
| shadcn init (v2/v3 CLI) | shadcn 4.x CLI: presets, `-t next` scaffold, `@import "shadcn/tailwind.css"` | shadcn 4.0+ | globals.css gains tw-animate-css + shadcn/tailwind.css imports; `radix-ui` unified package for new components |
| Neon driver pre-GA | @neondatabase/serverless 1.x GA (HTTP + WebSocket, Node ≥19) | v1.0.0 (2025) | Stable API; `transaction()` for batch queries |
| `ws` package + `neonConfig.webSocketConstructor` | Global WebSocket (Node ≥22) | Node 22 (2024) | No extra dependency needed on Node 24 |
| Zod 3 (`z.string().url()`, `.flatten()`) | Zod 4 (`z.url()`, `.flattenError()`) | Zod 4 (mid-2025) | API renames affect validate.ts + env schema |
| jsonwebtoken | jose | 2022+ (unmaintained) | jose is the ecosystem standard (used by Auth.js) |

**Deprecated/outdated:**
- `middleware.ts` + `middleware()` export: deprecated in Next 16 → `proxy.ts` + `proxy()`.
- `next lint`: removed from `next build` flow in Next 16; run `eslint` directly.
- `z.string().url()` / `error.flatten()`: deprecated in Zod 4.
- `neonConfig.webSocketConstructor = ws`: unnecessary on Node ≥22 (keep the comment for pre-22 runtimes).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | create-next-app proceeds in the non-empty repo root (only `.planning/` + `PRD.md` present, no conflicting app files) | Topic 1 | LOW — CNA prompts to confirm; fallback is scaffold-to-temp-dir-and-copy (planner: add fallback step) |
| A2 | React Compiler prompt should be answered "No" | Topic 1 | LOW — optional; default keeps template dependency-free of compiler semantics |
| A3 | `process.loadEnvFile(".env.local")` works on Node 24 for the seed script | Topic 5 | LOW — Node ≥20.12 API; fallback `--env-file=.env.local` tsx flag |
| A4 | Mock interface method names (createPayment/sendEmail/sendSms/getAuthUrl/geocode/upload) mirror real APIs closely enough | Topic 4 | MEDIUM — exact Stripe/SendGrid parity isn't required (portfolio scale, no real swap planned in v1); interface stability matters more than name parity |
| A5 | `SESSION_SECRET` min 32 chars in env schema | Topic 7 | LOW — HS256 requires ≥32-byte secret for safety; schema enforces it |
| A6 | CSRF: SameSite=Lax + built-in server-action Origin check suffice for Phase 0; Origin check added to proxy for /api mutations as template hardening | Topic 3 | LOW — server actions are the only mutation path in Phase 0 (UI-SPEC); the proxy check is future-proofing |
| A7 | `pg_stat_user_tables.n_live_tup` is accurate enough for the seed row-count report | Topic 5 | LOW — approximate on non-VACUUMed tables; acceptable for the report; exact counts via `SELECT count(*)` per table if precision needed |
| A8 | Rate limiting (in-memory) is deferred — not in Phase 0 scope | Security | LOW — demo scale; noted in README budget |

## Open Questions

1. **Neon project provisioning (DEPL-03)**
   - What we know: console-only workflow (no neonctl installed); pooled + direct strings from the Connect modal.
   - What's unclear: whether Phase 0 creates the Neon project now (needs the user's Neon account) or documents it for first-deploy time.
   - Recommendation: plan includes a `checkpoint:human-verify` for the user to create the Neon project and paste the two strings into `.env.local` before the first `npm run seed`; seed/build tasks fail fast with the env schema's clear error if missing.

2. **Template versioning marker (Pitfall 4)**
   - What we know: prior research recommends a `TEMPLATE_VERSION` constant to detect template drift across the 30 apps.
   - What's unclear: exact mechanism (lib/site.ts field vs package.json field).
   - Recommendation: add `TEMPLATE_VERSION: "0.1.0"` to `lib/site.ts` (single source) and document in README; trivially cheap now, hard to retrofit later.

3. **`.env.example` committed values**
   - What we know: `.env.example` is committed with placeholders; real values live in `.env.local` + Vercel dashboard.
   - Recommendation: commit `.env.example` exactly as Topic 7 (placeholders only); no real secrets anywhere.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | create-next-app, next build, seed | ✓ | v24.18.0 (global WebSocket ✓) | — |
| npm | installs, scripts | ✓ | 11.18.0 | — |
| Git + identity | DEPL-01 push | ✓ | 2.46.1 (NARVS1999) | — |
| Global WebSocket | Neon Pool without `ws` pkg | ✓ | (Node 24 built-in) | install `ws` + webSocketConstructor on older Node |
| Vercel CLI | CLI-driven deploy | ✗ | — | Dashboard import (no CLI needed for Hobby) |
| gh CLI | GitHub repo creation from terminal | ✗ | — | GitHub web UI + `git remote add` |
| neonctl | Neon project via CLI | ✗ | — | Neon console (Connect modal) |
| Local Postgres | — | ✗ (intentional) | — | Neon cloud DB (locked decision) |

**Missing dependencies with no fallback:** none — every missing tool has a documented web-UI alternative.
**Missing dependencies with fallback:** vercel CLI, gh CLI, neonctl (dashboard/console workflows; install later only if CLI automation is desired).

## Security Domain

> `security_enforcement: true` (config), ASVS level 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | bcryptjs (cost 10, 72-byte cap), jose JWT HS256, zod login/register schemas |
| V3 Session Management | yes | Stateless 30d JWT in httpOnly cookie: `secure` (prod), `SameSite=Lax`, `path=/`; verify on every guarded route + every handler/action |
| V4 Access Control | yes | proxy guard (/admin, /api/*) + in-handler re-verification; post ownership check (`authorId = session.sub`) against IDOR |
| V5 Input Validation | yes | zod 4 everywhere: register/login/post schemas + env schema (TMPL-09/10) |
| V6 Cryptography | yes | jose only (never hand-roll); bcryptjs for hashing; SESSION_SECRET ≥32 bytes via `openssl rand -base64 32` |
| V8 (SSRF/outbound) | n/a Phase 0 | Mock services never make real outbound calls |
| V9 (Logging) | n/a Phase 0 | Demo scale; mock event tables act as audit trail |

### Known Threat Patterns for the template stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection | Tampering | neon() template tags / `sql.query($1)` parameterization — never string-interpolate input |
| CSRF (cookie auth) | Spoofing | SameSite=Lax + Next.js server-action Origin-vs-Host check (built-in); proxy Origin check for /api mutations as template hardening |
| Session hijacking (XSS) | Information Disclosure | httpOnly cookie (JS-inaccessible); React escapes output; no secrets in client bundles (server-only boundary, no NEXT_PUBLIC secrets) |
| JWT tampering / forged tokens | Tampering | jose jwtVerify with HS256 + ≥32-byte secret; unknown/expired → null → 401/redirect |
| IDOR (delete/edit others' posts) | Elevation | Ownership check in DAL: `WHERE id = $1 AND author_id = $2` / compare before mutate |
| Brute force on login | Denial / Elevation | bcrypt cost 10; rate limiting deferred (A8) — documented in README; demo scale |
| Secret leakage | Information Disclosure | `.env.local` gitignored; `.env.example` placeholders only; `server-only` import enforcement; process.env only in server modules |
| Cookie fixation | Spoofing | Fresh JWT issued at every login (stateless — no pre-login session to fixate) |

## Key Decisions for Planner

1. **Use `proxy.ts`, not `middleware.ts`** — Next 16 renamed the convention; export `function proxy(request)`; no `runtime` export allowed; matcher covers `/admin/:path*`, `/api/:path*`, `/dashboard/:path*`, `/posts/:path*` with `/api/auth/login|register` whitelisted.
2. **Two DATABASE_URLs**: `DATABASE_URL` (pooled `-pooler` suffix) for the app; `DATABASE_URL_DIRECT` for seed/migrations — both in `.env.example`, both zod-validated.
3. **`export const dynamic = 'force-dynamic'` on every DB-reading page and GET route handler** — template-wide rule; prevents build-time DB queries and stale static data.
4. **No `ws` package** — Node 24 global WebSocket; `neon()` for one-shot queries; `withPool()` per-transaction for BEGIN/COMMIT; never module-scope Pool in serverless.
5. **bcryptjs lives only in route handlers/server actions and the seed script; proxy verifies JWT only** (jose). Add `max(72)` to password schemas.
6. **Verify auth inside every route handler and server action** — proxy is a convenience gate, not the security boundary (Next.js data security guide); use `getCurrentUser = cache(...)` DAL in `lib/session.ts`.
7. **Zod 4 API**: `z.url()`, `.flattenError()`, `safeParse` — used in `lib/validate.ts` for both input schemas and the startup env schema (TMPL-09/10).
8. **shadcn init before theming**; apply UI-SPEC token values (indigo primary, radius 0.75rem) after init; accept CLI-added `tw-animate-css` + `shadcn/tailwind.css` imports; next-themes 0.4.6 pattern from shadcn docs verbatim.
9. **Seed**: `tsx scripts/seed.ts` + `process.loadEnvFile(".env.local")` + migrations-first (direct conn, `schema_migrations` ledger) + `ON CONFLICT` upserts + `pg_database_size` report with ≥200 MB → exit(1).
10. **Tests (tdd_mode)**: vitest 4.1.10 + RTL per Next.js official guide; unit-test schemas/env/session/mocks with `vi.mock("@/lib/db")`; never unit-test async Server Components; add `vitest.config.mts` in Wave 0.
11. **Plan 00-01 executes**: create-next-app → shadcn init (zinc) → component add list → apply tokens → `.env.example`; **plan 00-02 executes**: db layer, auth (proxy.ts + session), mocks, seed, theme, Pages/CRUD per UI-SPEC.
12. **Deployment in Phase 0 scope = documentation + `.env.example` + README** (DEPL-01..05 artifacts); actual Neon project creation and Vercel import happen at first-deploy with `checkpoint:human-verify` (user's accounts).

## Sources

### Primary (HIGH confidence — official docs, fetched 2026-08-02; versions verified via `npm view` on the same date)
- [Next.js docs — Installation (v16.2.12)](https://nextjs.org/docs/app/getting-started/installation) — create-next-app defaults/flags, Turbopack default, lint changes
- [Next.js docs — proxy.js file convention (v16.2.12)](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) — middleware→proxy rename, Node runtime default, matcher, cookies, codemod
- [Next.js docs — Data security guide (v16.2.12)](https://nextjs.org/docs/app/guides/data-security) — DAL pattern, server-action CSRF/Origin checks, auth-in-every-action, server-only
- [Next.js docs — Vitest guide (v16.2.12)](https://nextjs.org/docs/app/guides/testing/vitest) — exact dev deps + config; async SC limitation
- [shadcn/ui docs — Next.js installation](https://ui.shadcn.com/docs/installation/next) and [CLI reference](https://ui.shadcn.com/docs/cli) — init/add flags, globals.css imports
- [shadcn/ui docs — Dark mode (Next.js)](https://ui.shadcn.com/docs/dark-mode/next) — next-themes pattern (exact props used in UI-SPEC)
- [Neon docs — Serverless driver](https://neon.tech/docs/serverless/serverless-driver) — neon()/transaction()/Pool, per-request rule, retry
- [Neon docs — Connection pooling](https://neon.tech/docs/connect/connection-pooling) — pooled vs direct strings, -pooler suffix, transaction-mode limits
- [Neon docs — Next.js guide](https://neon.tech/docs/guides/nextjs) — App Router patterns, force-dynamic gotcha
- [jose README (panva/jose)](https://github.com/panva/jose) — zero deps, universal runtimes, v6 line
- [bcrypt.js README (dcodeIO)](https://github.com/dcodeIO/bcrypt.js) — pure JS, WebCrypto, 72-byte limit
- [Zod docs (zod.dev)](https://zod.dev/) — v4 stable, requirements (strict mode)

### Secondary (MEDIUM confidence)
- `.planning/research/*` (STACK.md, PITFALLS.md, ARCHITECTURE.md, SUMMARY.md, FEATURES.md — prior milestone research, 2026-08-01; versions re-verified against the registry this session, patterns cross-checked against official docs)
- PRD.md + CONTEXT.md + UI-SPEC.md (project decisions — authoritative for scope, treated as CITED)

### Tertiary (LOW confidence)
- CSRF Origin-check details for fetch-based /api mutations (standard OWASP pattern, not verified against a fetched page this session — marked ASSUMED A6)
- `pg_stat_user_tables` row-count accuracy (standard Postgres catalog, ASSUMED A7)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version verified via `npm view` 2026-08-02; every pattern from official docs fetched this session
- Architecture: HIGH — proxy.ts convention, Neon driver rules, DAL pattern all verified against current official docs; mock/seed structures grounded in locked decisions
- Pitfalls: MEDIUM-HIGH — pitfalls 1–3, 5–7 verified against fetched docs; 4, 8, 9 are standard-practice (ASSUMED A3/A7)

**Research date:** 2026-08-02
**Valid until:** 2026-09-01 (fast-moving: Next.js canary 16.3 + shadcn CLI iterate quickly; re-verify versions before execution if > 30 days)
