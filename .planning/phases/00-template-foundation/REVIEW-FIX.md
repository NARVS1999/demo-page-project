---
phase: 00-template-foundation
fixed_at: 2026-08-02T03:05:00Z
review_path: .planning/phases/00-template-foundation/REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 00: Code Review Fix Report

**Fixed at:** 2026-08-02T03:05:00Z
**Source review:** `.planning/phases/00-template-foundation/REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 9 (1 critical, 3 warnings, 5 info)
- Fixed: 9
- Skipped: 0

## Fixed Issues

### CR-01: Env fail-fast validation ships to the client bundle — login/register pages crash in the browser

**Files modified:** `lib/env.ts` (new), `lib/validate.ts`, `lib/session.ts`, `lib/db.ts`, `lib/mock/email.ts`, `lib/mock/maps.ts`, `lib/mock/oauth.ts`, `lib/mock/payment.ts`, `lib/mock/sms.ts`, `lib/mock/storage.ts`, `__tests__/session.test.ts`, `__tests__/validate.test.ts`, `__tests__/setup-env.ts`
**Commit:** `94fd1e7`
**Applied fix:** Created server-only `lib/env.ts` (imports `"server-only"`) holding `envSchema`, `formatEnvErrors`, the module-load `safeParse(process.env)` + `process.exit(1)` fail-fast, and the `env` export. Rewrote `lib/validate.ts` to contain input schemas only (no env parsing, no `process.exit`, no module side effects) so login/register client chunks stay bundle-safe. Updated every server-side env consumer (`lib/session.ts`, `lib/db.ts` — now reads `env.DATABASE_URL[(_DIRECT)]` instead of `process.env`, `lib/mock/*`) plus the test suite to import `env`/`envSchema` from `@/lib/env`.
**Verification status:** `fixed: requires human verification` — build + chunk-grep verified (see below); a real browser visit to `/login` + `/register` is deferred to the verifier phase.

### WR-01: Open redirect via unvalidated `?next=` on login

**Files modified:** `lib/utils.ts`, `app/(auth)/login/page.tsx`
**Commit:** `58b139b`
**Applied fix:** Added shared `safeNextUrl(next, fallback = "/dashboard")` helper to `lib/utils.ts` — accepts only values starting with `/` and not `//`; login page now calls `router.push(safeNextUrl(next))` on success. Helper logic unit-verified (rejects `//evil.com`, `https://evil.com`, null; accepts `/dashboard`, `/posts/123`).
**Verification status:** `fixed: requires human verification` (runtime redirect behavior deferred to verifier phase).

### WR-02: Proxy Origin/CSRF check protects zero endpoints — auth mutations (incl. logout) are CSRF-exposed

**Files modified:** `proxy.ts`
**Commit:** `8f984bf`
**Applied fix:** Moved the Origin/Referer CSRF check for non-GET `/api/*` requests **before** the `PUBLIC_AUTH_PATHS` whitelist early-return, so `/api/auth/login`, `/api/auth/register`, and `/api/auth/logout` are now covered. Missing-Origin pass-through (curl compat) preserved; whitelist behavior unchanged.
**Verification status:** `fixed: requires human verification` (runtime CSRF behavior deferred to verifier phase).

### WR-03: Register handler leaks DB state and 500s on any DB error — contradicts the login generic-error pattern

**Files modified:** `app/api/auth/register/route.ts`
**Commit:** `1735c84`
**Applied fix:** Wrapped the SELECT + bcrypt + INSERT + session-creation flow in try/catch. Unique violation (Postgres code `23505`, e.g. a raced concurrent registration) maps to the existing 409 "That email is already registered."; any other DB error returns a generic 500 "Registration failed. Please try again." — no DB-state leak. Zod 400 responses unchanged.
**Verification status:** `fixed: requires human verification` (DB-dependent behavior deferred to verifier phase).

### IN-01: Post id not validated as UUID → 500 instead of 404/form error

**Files modified:** `lib/utils.ts`, `app/(main)/posts/actions.ts`, `app/(main)/posts/[id]/edit/page.tsx`
**Commit:** `e773c5d`
**Applied fix:** Added `isUuid()` helper (canonical UUID regex) to `lib/utils.ts`. `updatePost`/`deletePost` return `{ message: "This post no longer exists." }` for non-UUID ids before querying; the edit page calls `notFound()`. Helper logic unit-verified (accepts uppercase UUIDs, rejects malformed/non-UUID strings).
**Verification status:** `fixed: requires human verification` (runtime 404 behavior deferred to verifier phase).

### IN-02: Seed migration fallback swallows the original error

**Files modified:** `scripts/seed.ts`
**Commit:** `1dbc2cc`
**Applied fix:** The statement-by-statement fallback now runs **only** when the driver's multi-statement rejection ("multiple commands" in the message) is detected. Any other error re-throws immediately as `Migration ${version} failed: <message>` with the original error as `cause`; failures inside the fallback loop also preserve the original multi-statement error as `cause`.
**Verification status:** `fixed` (verified by tsc + lint + tests; DB execution deferred).

### IN-03: Draft posts of other users are visible to every authenticated user

**Files modified:** `app/(main)/posts/page.tsx`
**Commit:** `2c732c9`
**Applied fix:** Listing query now filters `WHERE posts.published = true OR posts.author_id = ${user.id}` with a comment documenting the choice — other users' drafts are invisible; the owner still sees their own drafts.
**Verification status:** `fixed: requires human verification` (DB-dependent behavior deferred to verifier phase).

### IN-04: Deprecated Zod 4 API `.flatten()` used instead of `.flattenError()`

**Files modified:** `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`, `app/(main)/posts/actions.ts`, `lib/env.ts`
**Commits:** `43538fe`, `51da277` (follow-up correction)
**Applied fix:** Replaced `.flatten()` with the Zod 4 canonical API at all four call sites. **Adaptation note:** zod 4.4.3 (the pinned version) has **no instance method** `flattenError()` — only the module-level `flattenError(error)` helper exported from the main `zod` entry (`.flatten()` is `@deprecated` in its typings). The review's `parsed.error.flattenError()` form was therefore adapted to `flattenError(parsed.error).fieldErrors` (verified: helper returns the same `{ formErrors, fieldErrors }` shape). `__tests__/validate.test.ts` `.flatten()` usages were left untouched per the review's enumerated four call sites.
**Verification status:** `fixed` (verified by tsc — the instance-method form failed typecheck, the helper form passes).

### IN-05: Login page mislabels non-401/409 responses as network failure

**Files modified:** `app/(auth)/login/page.tsx`
**Commit:** `9e3e7a6`
**Applied fix:** 400 responses now share the 401 branch's generic "Check your details and try again." copy instead of falling into the misleading "Couldn't reach the server. Try again." network-error branch. Non-400/401 responses still show the network copy.
**Verification status:** `fixed` (simple client branch change; browser visit deferred to verifier phase).

## Verification Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS (0 errors) |
| `npm run lint` | PASS (0 errors; 2 pre-existing warnings in untouched test files) |
| `npm run test` | PASS (31/31 tests, 4 files) |
| `npm run build` | PASS (Next.js 16.2.12, Turbopack; 13 routes + proxy compiled) |
| Client chunks `.next/static/chunks` contain "Invalid environment variables" | **ABSENT** (0 of 26 chunk files — CR-01 verified) |
| Client chunks contain `process.exit` / `DATABASE_URL` env-schema keys | **ABSENT** (CR-01 verified) |
| Server chunks contain the env fail-fast | **PRESENT** (fail-fast retained server-side) |
| Env fail-fast runtime | Fired during build with no env: `Invalid environment variables: - DATABASE_URL: ...` + worker exit 1 (server-side fail-fast proven); `npx tsx -e "import('./lib/env')"` exits 1 via the server-only guard |
| Helper logic (safeNextUrl / isUuid) | Unit-verified in isolation — all cases PASS |

## Notes

- `.env.local` was copied into the isolated worktree for the build (it is gitignored — never committed; the main repo's copy was untouched).
- Worktree isolation: all fixes were committed on temp branch `gsd-reviewfix/00-1011` inside worktree `sv-00-reviewfix-aSqmUb`, then fast-forwarded to `master`; the worktree, temp branch, and recovery sentinel were cleaned up afterwards.
- `REVIEW.md` frontmatter updated to `status: clean`; every finding marked `**Fixed in:** <commit>`. Findings text preserved.

---

_Fixed: 2026-08-02_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
