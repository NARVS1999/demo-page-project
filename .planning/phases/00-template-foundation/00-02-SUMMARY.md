---
phase: 00-template-foundation
plan: 00-02
subsystem: infrastructure (env validation, DB layer, auth, mock services, seed, UI, docs)
tags: [nextjs16, neon, raw-sql, jose, bcryptjs, zod4, proxy-guard, server-actions, mock-services, seed, shadcn-ui, vitest]

requires:
  - phase: "00-01 — scaffold: Next 16 app, shadcn tokens, vitest harness, .env.example, server-only stub"
    provides: "base app, ui components, test infra, canonical env contract"
provides:
  - "Zod-4 env fail-fast validation + register/login/post input schemas (lib/validate.ts)"
  - "jose JWT session auth (createSession/verifySession/getCurrentUser) + proxy.ts guard with Origin CSRF check"
  - "Serverless-safe DB layer: neon() HTTP + per-request withPool transactions (lib/db.ts)"
  - "6 DB-backed mock services (payment/email/sms/oauth/maps/storage) behind MOCK_* switches"
  - "Idempotent seed with migration ledger + fixed-ID upserts + <200 MB hard gate"
  - "login/register/logout route handlers with generic-401 anti-enumeration login"
  - "Full UI-SPEC public+protected UI: theme, shells, landing, auth pages, dashboard, Posts CRUD, admin pages"
  - "README: quick start, demo creds, mock docs, $0 deploy guide"
affects: [phase 1+ future apps — every downstream app copies these conventions]

tech-stack:
  added: [none new beyond 00-01 pins; used: next/headers async cookies, useActionState, alert-dialog, sidebar]
  patterns:
    - "proxy.ts (Next 16) as single guard + in-handler/in-action auth re-verification (defense in depth)"
    - "neon() template tags parameterize interpolations; unsafe()/query() only for trusted DDL/identifiers"
    - "server actions return {ok} instead of redirect() so client toasts survive navigation"
    - "timestamptz rows arrive as JS Date from neon — compare with getTime(), not localeCompare"

key-files:
  created:
    - lib/db.ts, lib/mock/{payment,email,sms,oauth,maps,storage,index}.ts, db/migrations/001_init.sql
    - scripts/seed.ts, proxy.ts, README.md
    - app/api/auth/{login,register,logout}/route.ts
    - app/(main)/{layout,page,dashboard/*,posts/*}, app/(auth)/{layout,login,register}, app/admin/*
    - app/{loading,error,not-found}.tsx
    - components/{theme-provider,theme-toggle}, layout/{app-shell,site-header,site-footer,user-menu,mobile-nav,admin-shell}, auth/auth-card, posts/{post-form,posts-table}, ui/{page-header,empty-state,error-state,stat-card}
  modified:
    - app/layout.tsx (shell-free root: skip link + ThemeProvider + Toaster), app/page.tsx (deleted — landing → (main)/page.tsx)
    - package.json (seed script)

key-decisions:
  - "Login returns generic 401 on ANY DB error (incl. missing users table pre-seed) — deterministic pre-seed checks + no DB-state enumeration"
  - "Proxy Origin check rejects only MISMATCH; missing Origin (curl/scripts) passes — browsers always attach Origin on POST"
  - "Server actions return {ok:true} and the client navigates + toasts — redirect() throws and would lose the UI-SPEC toasts"
  - "Seed migration runner splits multi-statement DDL on ';\\n' (not ';') — semicolons inside single-line comments are safe"
  - "OAuth mock is stateless (no mock_oauth_attempts table) — documented in file header"
  - "neon timestamptz → JS Date: activity sorting uses getTime()"

patterns-established:
  - "Pattern: server-only boundaries (lib/db, lib/session, lib/mock) — client import = build error"
  - "Pattern: force-dynamic on every DB-reading page/route"
  - "Pattern: bcryptjs only in route handlers + seed"
  - "Pattern: ownership-scoped SQL (WHERE author_id) for IDOR prevention"
  - "Pattern: MOCK_* switch read from env; 'real' throws (reserved)"

requirements-completed: [TMPL-02, TMPL-03, TMPL-04, TMPL-05, TMPL-06, TMPL-07, TMPL-08, TMPL-09, TMPL-10, DEPL-01, DEPL-02, DEPL-03, DEPL-04, DEPL-05]

coverage:
  - id: D1
    description: "Zod-4 env fail-fast + input schemas with UI-SPEC copy"
    requirement: TMPL-09, TMPL-10
    verification:
      - kind: unit
        ref: "__tests__/validate.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "jose JWT session sign/verify + cookie DAL"
    requirement: TMPL-02
    verification:
      - kind: unit
        ref: "__tests__/session.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Env probe + DB reachability (fail-fast, load, SELECT version())"
    requirement: TMPL-10, DEPL-03
    verification:
      - kind: other
        ref: "npx tsx -e import('./lib/validate.ts') (no env → exit 1); --env-file probe exit 0; SELECT version() → PostgreSQL 18.4"
        status: pass
    human_judgment: false
  - id: D4
    description: "DB layer: sql/sqlDirect/withPool + idempotent 7-table schema + proxy guard"
    requirement: TMPL-03, TMPL-02
    verification:
      - kind: other
        ref: "npx tsc --noEmit && npm run build (pass); proxy redirects /dashboard|/posts|/admin → /login?next= verified via curl 307"
        status: pass
    human_judgment: false
  - id: D5
    description: "6 mock services + index, MOCK_* switches, DB persistence"
    requirement: TMPL-04
    verification:
      - kind: unit
        ref: "__tests__/mock.test.ts (11 tests)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Auth route handlers with generic-401 login, 409 duplicate, auto-login register"
    requirement: TMPL-02
    verification:
      - kind: other
        ref: "curl: login pre-seed → 401; register 'T'/'short' → 400 flattened; dup email → 409; demo login → 200"
        status: pass
    human_judgment: false
  - id: D7
    description: "Idempotent seed: ledger, upserts, size report, <200 MB gate"
    requirement: TMPL-05, DEPL-03
    verification:
      - kind: other
        ref: "npm run seed twice against live Neon — run1 applies 001_init, run2 skips; identical 11 rows, 7.70 MB"
        status: pass
    human_judgment: false
  - id: D8
    description: "Public UI per UI-SPEC (theme, shells, landing, auth pages, 404)"
    requirement: TMPL-06, TMPL-07, TMPL-08
    verification:
      - kind: automated_ui
        ref: "curl SSR: / hero+CTAs, /login demo Alert, /register, /nonexistent 404; build/lint/test green"
        status: pass
    human_judgment: true
    rationale: "Dark/light toggle behavior, hydration-flash absence, and color-contrast spot checks require a human in a browser"
  - id: D9
    description: "Protected UI: dashboard, Posts CRUD with ownership, admin pages, skeletons/error boundaries"
    requirement: TMPL-06, TMPL-07, TMPL-08
    verification:
      - kind: automated_ui
        ref: "curl with session cookie: dashboard stats + recent posts; posts lists 3 seeded; admin/emails/sms show seed events; 2nd user edit of demo post → 404 (not-found UI); logout → 307 next"
        status: pass
    human_judgment: true
    rationale: "Browser-only flows — delete confirm dialog, toasts, pending spinners, dark mode on every page, 320px viewport — need human verification"
  - id: D10
    description: "README with demo creds, mock docs, deploy guide, ops + security notes"
    requirement: DEPL-01, DEPL-02, DEPL-03, DEPL-04, DEPL-05
    verification:
      - kind: other
        ref: "grep -c demo@example.com / demo1234 / DATABASE_URL README.md → ≥1 each; manual link check"
        status: pass
    human_judgment: false
---

# Phase 0 Plan 2: Core infrastructure — env, DB layer, auth, mock services, seed, UI, deploy docs

**One-liner:** Full template core — Zod-4 fail-fast env, serverless-safe neon DB layer, jose JWT auth with proxy guard, 6 DB-backed mock services, idempotent seed with a 200 MB hard gate, complete UI-SPEC UI (theme, shells, landing, auth, dashboard, Posts CRUD, admin), and a $0 deploy README.

## Key Results

- **All 10 tasks complete** (9 auto + 1 resolved checkpoint gate), every task committed atomically (11 commits for this plan).
- **Checkpoint 00-02-03 (Neon):** resolved by user — `.env.local` holds both real Neon URLs + SESSION_SECRET; all three probes re-run and passed: no-env fail-fast (exit 1, clear `DATABASE_URL` line), env-loaded probe (exit 0), `SELECT version()` → PostgreSQL 18.4 (pooled).
- **Seed verified twice against live Neon:** run 1 applied `001_init` (7 tables) + demo data; run 2 skipped via ledger with identical row counts (11 rows, 7.70 MB) — idempotency proven.
- **E2E curl verification:** login (200), pre-seed generic 401, register 400/409, dashboard stats + recent posts, posts list (3 seeded), admin overview/emails/sms (seed events render), ownership: second user edit of demo post → not-found UI, session-expiry: `/dashboard|/posts|/admin` → `307 /login?next=…`, logout (200).
- **Quality gates:** `tsc --noEmit` clean, `next build` green (all DB routes ƒ dynamic), `npm run lint` 0 errors (2 pre-existing warnings in test files), 31/31 vitest tests green.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] neon driver rejects plain-string / multi-statement SQL calls**
- **Found during:** Task 7 (seed) + Task 7 probes
- **Issue:** This `@neondatabase/serverless@1.1.0` build only accepts tagged-template calls (`sql\`…\``); `sql("…")` throws, `query()` cannot run multi-statement DDL ("cannot insert multiple commands into a prepared statement"), and naive `;` splitting cut inside a migration-file comment containing a semicolon (`-- (idempotent; applied by …)`).
- **Fix:** Seed uses `sqlDirect.query()` with a `;` → `;\n` split fallback (semicolons inside single-line comments never end a statement); `sql.unsafe()` used only as a tagged-template interpolation for hardcoded table identifiers.
- **Files modified:** `scripts/seed.ts`
- **Commit:** `61d3401`

**2. [Rule 1 - Bug] Seed failed on fresh DB — ledger check before ledger exists**
- **Found during:** Task 7 first seed run
- **Issue:** `SELECT 1 FROM schema_migrations` ran before the ledger table existed ("relation schema_migrations does not exist").
- **Fix:** Bootstrap `CREATE TABLE IF NOT EXISTS schema_migrations` before the migration loop.
- **Files modified:** `scripts/seed.ts`
- **Commit:** `61d3401`

**3. [Rule 1 - Bug] Admin activity sort crashed on JS Date**
- **Found during:** Task 9 E2E verification (`GET /admin` errored; content missing from SSR)
- **Issue:** neon returns `timestamptz` columns as JS `Date` objects; `created_at.localeCompare()` threw `TypeError: b.created_at.localeCompare is not a function`.
- **Fix:** Compare via `getTime()` (also documented as a template pattern in the SUMMARY frontmatter).
- **Files modified:** `app/admin/page.tsx`
- **Commit:** `aba7c1f`

**4. [Rule 1 - Bug] Proxy Origin check blocked curl (no Origin header)**
- **Found during:** Task 6 manual verification (curl returned 403 instead of expected 401/400)
- **Issue:** The first proxy draft returned 403 when Origin/Referer was absent; curl and scripted clients send neither, and browsers always attach Origin on POST — so presence-checking broke the plan's own manual checks without adding CSRF protection.
- **Fix:** Reject only on mismatch/malformed header; missing header passes through.
- **Files modified:** `proxy.ts`
- **Commit:** `89beac2`

**5. [Rule 3 - Tooling] shadcn CLI silently failed to install `form` component**
- **Found during:** Task 8 (UI-SPEC inventory includes `form`)
- **Issue:** `npx shadcn@latest add form` exited 0 without installing; the registry item endpoint returned a 404 HTML page (CDN/CLI mismatch in this environment).
- **Fix:** Auth/CRUD forms built with plain `Label`/`Input` + react-hook-form + inline `aria-invalid`/`aria-describedby` errors per the plan's explicit form spec — the shadcn `form.tsx` wrapper is optional sugar; behavior identical.
- **Files modified:** none beyond plan files (no form.tsx created)
- **Commit:** `76148fb`

### Deliberate implementation choices (documented deviations)

**1. Server actions return `{ok}` instead of calling `redirect()`** — `redirect()` throws and discards return values, which would lose the UI-SPEC toasts ("Post created." / "Post updated." / "Post deleted."). Client navigates + toasts on `ok`; observable behavior matches the spec (land on /posts + toast). **Files:** `app/(main)/posts/actions.ts`, `components/posts/post-form.tsx`, `components/posts/posts-table.tsx` — commit `aba7c1f`.

**2. Two small client companion components added** (`components/layout/user-menu.tsx`, `components/layout/mobile-nav.tsx`) — the plan's file list omitted them, but the spec'd logout behavior (`POST /api/auth/logout` + `router.push` + `router.refresh`) and the mobile sheet nav require client components; the header itself stays a server component. — commit `76148fb`.

**3. TDD REFACTOR gate skipped for Task 5** — per-file `assertMockMode` kept self-contained (the documented swap-replaces-file pattern) and persist logic is table-specific; no shared helper warranted; every mock file < 100 lines. — commit `6571ca4`.

## Auth Gates

None — no external auth was required (all verification used local demo creds against the local route handlers).

## Known Stubs

None. Seed data is real and rendering in all admin views; no TODO/FIXME/placeholder text in shipped code.

## Deferred Items

- Rate limiting on auth endpoints — documented in README (security posture) as a deliberate deferral (RESEARCH A8); future app.
- Mock-usage demo flows (calling the mock services from app code) — plan defers to Phase 2; persistence contract proven by seed data rendering in `/admin`.
- `vite-tsconfig-paths` deprecation warning (vitest now supports tsconfigPaths natively) — cosmetic; can remove the plugin in a future cleanup.
- 2 pre-existing eslint warnings in test files (`_drop` in validate.test.ts from Task 1; `_args` in mock.test.ts) — out of Task-8+ scope, left as-is.

## Threat Flags

None — no new security surface beyond the plan's `<threat_model>` (proxy Origin check added per A6 as planned; no new endpoints/files beyond plan files list + 2 client companions).

## Self-Check: PASSED

- All summary-claimed files exist (verified via git status + spot reads).
- All 11 commits present in `git log` (see Commits below).
- Final gates re-run after last commit: lint 0 errors, 31/31 tests, tsc clean, `next build` green.

## Commits (plan 00-02)

| Task | Commit | Message |
|------|--------|---------|
| 3 (checkpoint, pre-existing) | `adc2104` | docs(00-02): record checkpoint stop at task 3 (Neon credentials) |
| 1 | `85c289f`, `0882dd8` | test/feat(00-02): validate RED+GREEN (refactor skipped — formatEnvErrors extracted in GREEN) |
| 2 | `924d14a`, `3753830` | test/feat(00-02): session RED+GREEN |
| 4 | `b96b720` | feat(00-02): lib/db.ts, 001_init.sql, proxy.ts |
| 5 | `b08f434`, `6571ca4` | test/feat(00-02): mock services RED+GREEN |
| 6 | `9efef1d` | feat(00-02): auth route handlers |
| 7 | `61d3401` | feat(00-02): scripts/seed.ts + seed script |
| 8 | `76148fb` | feat(00-02): public UI per UI-SPEC |
| 9 | `aba7c1f` | feat(00-02): protected UI — dashboard, Posts CRUD, admin |
| 10 | `ad7abfa` | docs(00-02): README |
| 6 fix | `89beac2` | fix(00-02): allow missing Origin on /api mutations in proxy |

**Duration:** ~1h 25m of execution (resumed session; checkpoint resolution by user beforehand).
**Completed:** 2026-08-02
**Status:** complete
