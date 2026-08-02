---
phase: 00-template-foundation
reviewed: 2026-08-02T12:00:00Z
depth: deep
files_reviewed: 40
files_reviewed_list:
  - proxy.ts
  - lib/validate.ts
  - lib/session.ts
  - lib/db.ts
  - lib/site.ts
  - lib/mock/index.ts
  - lib/mock/payment.ts
  - lib/mock/email.ts
  - lib/mock/sms.ts
  - lib/mock/oauth.ts
  - lib/mock/maps.ts
  - lib/mock/storage.ts
  - app/api/auth/login/route.ts
  - app/api/auth/register/route.ts
  - app/api/auth/logout/route.ts
  - app/(main)/posts/actions.ts
  - app/(main)/posts/page.tsx
  - app/(main)/posts/new/page.tsx
  - app/(main)/posts/[id]/edit/page.tsx
  - app/(main)/dashboard/page.tsx
  - app/(main)/page.tsx
  - app/(main)/layout.tsx
  - app/admin/layout.tsx
  - app/admin/page.tsx
  - app/admin/emails/page.tsx
  - app/admin/sms/page.tsx
  - app/(auth)/layout.tsx
  - app/(auth)/login/page.tsx
  - app/(auth)/register/page.tsx
  - app/layout.tsx
  - app/loading.tsx
  - app/error.tsx
  - app/not-found.tsx
  - components/layout/app-shell.tsx
  - components/layout/site-header.tsx
  - components/layout/site-footer.tsx
  - components/layout/user-menu.tsx
  - components/layout/mobile-nav.tsx
  - components/layout/admin-shell.tsx
  - components/posts/post-form.tsx
  - components/posts/posts-table.tsx
  - components/auth/auth-card.tsx
  - components/theme-provider.tsx
  - components/theme-toggle.tsx
  - scripts/seed.ts
  - db/migrations/001_init.sql
  - __tests__/session.test.ts
  - __tests__/mock.test.ts
  - __tests__/validate.test.ts
findings:
  critical: 1
  warning: 3
  info: 5
  total: 9
status: clean
---

# Phase 0: Code Review Report

**Reviewed:** 2026-08-02
**Depth:** deep
**Files Reviewed:** 40
**Status:** findings

## Summary

Reviewed the full Phase 0 working tree: auth (proxy guard, session, 3 route handlers), DB layer, 6 mock services, seed + migration runner, all public/protected UI, and the test suite. Verified against the built artifacts (`.next/static/chunks`), not just source.

The template's backbone is solid: ownership-scoped SQL on every posts mutation (no IDOR), bcryptjs confined to route handlers + seed, generic-401 anti-enumeration login, parameterized SQL everywhere (the single `unsafe()` use is a hardcoded table name), correct cookie attributes (httpOnly/secure-prod/lax/30d), force-dynamic on every DB-reading route, and server-only boundaries respected (no server-only module is imported from a client component).

**However, one BLOCKER was found that the green build hides:** `lib/validate.ts` carries its module-level env validation (`safeParse` + `process.exit(1)`) into the **client bundle** because the login/register pages import `loginSchema`/`registerSchema` from it. The compiled client chunk (`.next/static/chunks/13k7ntpoj3_-i.js`, loaded by the login page chunk via module id 94814) contains `envSchema.safeParse(process.env)` → in the browser `process.env` is `{}` (no `NEXT_PUBLIC_*` vars are inlined), so the parse **always fails**, and `process.exit(1)` executes where `process.exit` does not exist in Next's client process polyfill (`next/dist/compiled/process/browser.js` has no `exit`) → **TypeError during chunk evaluation → /login and /register are broken in every real browser**. The build is green because webpack never executes modules and the curl SSR checks never run client JS; the phase's browser checks were deferred (`human_judgment: true`).

## Critical Issues

### CR-01: Env fail-fast validation ships to the client bundle — login/register pages crash in the browser

**Fixed in:** `94fd1e7` (split env fail-fast into server-only `lib/env.ts`; `lib/validate.ts` is now client-safe schemas only; all server importers updated)

**File:** `lib/validate.ts:31-38` (triggered via `app/(auth)/login/page.tsx:17` and `app/(auth)/register/page.tsx:17`)
**Severity:** high (BLOCKER)
**Issue:** `lib/validate.ts` executes `envSchema.safeParse(process.env)` and `process.exit(1)` at **module load**. The login and register pages (`"use client"`) import `loginSchema`/`registerSchema` from this module, so the entire module — including the fail-fast block — is bundled and **executed in the browser**. Proof from the compiled output:

- `.next/static/chunks/13k7ntpoj3_-i.js` contains `dS.object({DATABASE_URL:dS.url(),…}).safeParse(eZ.default.env); dw.success||(console.error("Invalid environment variables:\n"+…),eZ.default.exit(1))`.
- The login page chunk `.next/static/chunks/35fn7-ukxl2q1.js` requires that chunk (`e.i(94814)`).
- In the browser, `process.env` is the Next client polyfill `{}` — `DATABASE_URL`/`SESSION_SECRET` are not `NEXT_PUBLIC_*`, so they are never inlined. `safeParse` **always fails**.
- The client `process` polyfill (`next/dist/compiled/process/browser.js`) has **no `exit` function** → `process.exit(1)` throws `TypeError` during chunk evaluation.

Net effect: the auth pages' client bundle fails to evaluate — the forms do not work in any real browser (dev or prod). This is the core login flow of the template; every downstream app inherits it. The green build + curl-SSR checks cannot detect it; only a browser visit does.

**Fix:** Split env validation from input schemas. Make the env module server-only and keep `lib/validate.ts` client-safe (no side effects):

```ts
// lib/env.ts (new, server-only)
import "server-only";
import { z } from "zod";
export const envSchema = z.object({ /* ...as today... */ });
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:\n" + formatEnvErrors(parsed.error.flatten().fieldErrors));
  process.exit(1);
}
export const env = parsed.data;
export function formatEnvErrors(fieldErrors: Record<string, string[] | undefined>): string { /* ... */ }

// lib/validate.ts (input schemas ONLY — no env parsing, no process.exit, no module side effects)
export const registerSchema = z.object({ /* ... */ });
export const loginSchema = z.object({ /* ... */ });
export const postSchema = z.object({ /* ... */ });
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PostInput = z.infer<typeof postSchema>;

// Update imports: lib/session.ts, lib/db.ts, lib/mock/* → import { env } from "@/lib/env";
// lib/validate.ts stays the single source for input schemas (client-safe).
```

Verify by: `grep -L "Invalid environment variables" .next/static/chunks/*.js` (must be absent) after a rebuild, and a real browser visit to `/login` + `/register`.

## Warnings

### WR-01: Open redirect via unvalidated `?next=` on login

**Fixed in:** `58b139b` (`safeNextUrl` helper in `lib/utils.ts`, used by the login page)

**File:** `app/(auth)/login/page.tsx:45`
**Severity:** medium
**Issue:** `router.push(next ?? "/dashboard")` passes the raw `?next=` query parameter to `router.push` with no validation. An attacker can send a victim `https://site/login?next=https://evil.com` (or `//evil.com`); after the victim successfully logs in, the browser navigates to the attacker's site — a classic post-auth open redirect usable for phishing (e.g., a look-alike "session expired, re-enter password" page). The proxy only ever generates safe pathname-based `next` values, but the login page trusts any value from the URL. This is template code that ~30 downstream apps will copy.

**Fix:** Only accept same-origin, absolute-path targets:

```ts
const next = searchParams.get("next");
const safeNext =
  next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
// ...
router.push(safeNext);
```

### WR-02: Proxy Origin/CSRF check protects zero endpoints — auth mutations (incl. logout) are CSRF-exposed

**Fixed in:** `8f984bf` (Origin check moved before the public-auth whitelist)

**File:** `proxy.ts:19-21` (early return) vs `proxy.ts:46-61` (Origin check)
**Severity:** medium
**Issue:** The Origin check runs only after the `PUBLIC_AUTH_PATHS` whitelist returns early. The only `/api/*` mutation endpoints that exist in Phase 0 are `/api/auth/login`, `/api/auth/register`, and `/api/auth/logout` — and all three are whitelisted, so the Origin check **never executes for any live endpoint**; it is dead code. Consequences:
- **Logout CSRF:** any third-party page can `fetch("https://site/api/auth/logout", {method:"POST"})`; the endpoint deletes the session cookie regardless of the request's cookies (sameSite=lax does not protect cookie *deletion* — the server's Set-Cookie applies to the response).
- **Login CSRF:** a third-party page can force the victim's browser to log into the attacker's account by POSTing attacker-chosen credentials.

The plan's A6 mitigation is thereby not applied where it matters most. (The deliberate "missing Origin passes" behavior — needed for curl checks — is fine and should stay.)

**Fix:** Move the Origin check **before** the whitelist early-return so it covers `/api/auth/*` too — the missing-header pass-through means curl checks are unaffected:

```ts
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.nextUrl.origin;

  // CSRF hardening for ALL non-GET /api/* requests — including the public auth
  // endpoints (login CSRF, logout CSRF). Missing Origin/Referer passes (curl).
  if (
    pathname.startsWith("/api/") &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method)
  ) {
    const header = request.headers.get("origin") ?? request.headers.get("referer");
    if (header) {
      try {
        if (new URL(header).origin !== origin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  if (PUBLIC_AUTH_PATHS.includes(pathname)) return NextResponse.next();
  // ... rest unchanged
}
```

### WR-03: Register handler leaks DB state and 500s on any DB error — contradicts the login generic-error pattern

**Fixed in:** `1735c84` (try/catch → generic 409 on unique violation `23505`, generic 500 otherwise)

**File:** `app/api/auth/register/route.ts:30-39`
**Severity:** medium
**Issue:** The login handler deliberately maps *any* DB error (including "relation users does not exist" pre-seed) to a generic 401 to keep DB state non-enumerable. The register handler has **no try/catch** around its queries: pre-seed it returns a 500 (leaking that the `users` table is missing), and the SELECT-then-INSERT duplicate check has a race — two concurrent registrations of the same email hit the UNIQUE constraint and return 500 instead of the intended 409. Both behaviors leak DB state and produce inconsistent client UX (the client's `register/page.tsx:47-51` only handles 409, so a 500 shows the wrong "Couldn't reach the server" copy).

**Fix:** Wrap the DB calls and map the unique-violation to 409:

```ts
try {
  const existing = await sql`SELECT 1 FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const rows = await sql`INSERT INTO users (email, name, password_hash)
    VALUES (${email}, ${name}, ${passwordHash})
    RETURNING id, email, name`;
  // ...createSession + cookie...
} catch (error) {
  // 23505 = unique_violation (race with a concurrent identical registration)
  if (error instanceof Error && "code" in error && (error as { code?: string }).code === "23505") {
    return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
  }
  return NextResponse.json({ error: "Registration unavailable. Try again." }, { status: 503 });
}
```

## Info

### IN-01: Post id not validated as UUID → 500 instead of 404/form error

**Fixed in:** `e773c5d` (`isUuid` helper in `lib/utils.ts`; actions return "This post no longer exists.", edit page `notFound()`)

**File:** `app/(main)/posts/actions.ts:59,87` and `app/(main)/posts/[id]/edit/page.tsx:21`
**Severity:** low
**Issue:** `updatePost`/`deletePost` accept any string as `id`, and the edit page passes any `params.id` into SQL. A non-UUID value makes Postgres throw `invalid input syntax for type uuid`, surfacing as a 500/error boundary rather than the designed "This post no longer exists." / 404 paths. Not exploitable (parameterized), but noisy and confusing.
**Fix:** `z.string().uuid()` check before querying (or `if (!id.match(/^[0-9a-f-]{36}$/i)) return { message: "This post no longer exists." };` in actions; `notFound()` in the edit page).

### IN-02: Seed migration fallback swallows the original error

**Fixed in:** `1dbc2cc` (fallback only on the driver's multi-statement rejection; original error preserved as `cause`)

**File:** `scripts/seed.ts:56-73`
**Severity:** low
**Issue:** When `sqlDirect.query(sql)` fails for *any* reason, the code assumes it was the multi-statement rejection and retries statement-by-statement, discarding the original error (`void error`). If a future migration has a genuine SQL error in statement N of M, statements 1..N-1 are applied, the seed aborts, and the ledger entry is never written — re-runs then re-attempt partially applied DDL. Benign today (all DDL is `IF NOT EXISTS`) but a fragile pattern for the template's future migrations.
**Fix:** Distinguish the two failure modes — only fall back on the driver's specific multi-statement error (`code`/message contains "multiple commands"), and include the original error in the fallback failure output: `throw new Error(\`Migration ${version} failed: ${error}\`, { cause: originalError })`.

### IN-03: Draft posts of other users are visible to every authenticated user

**Fixed in:** `2c732c9` (listing filters `published = true OR author_id = current user`)

**File:** `app/(main)/posts/page.tsx:17-20`
**Severity:** low
**Issue:** The posts listing selects all posts with no `published` or `author_id` filter, so any authenticated user can read other users' unpublished drafts (title + author). This matches the plan's spec, but as template code it is an authorization footgun for downstream apps.
**Fix:** At minimum add a comment in the page documenting the choice; if drafts should be private, filter `WHERE published = true OR author_id = ${user.id}`.

### IN-04: Deprecated Zod 4 API `.flatten()` used instead of `.flattenError()`

**Fixed in:** `43538fe` + `51da277` (uses the module-level `flattenError()` helper — zod 4.4.3 has no instance method, so the review's `parsed.error.flattenError()` form was adapted)

**File:** `lib/validate.ts:35`, `app/api/auth/login/route.ts:26`, `app/api/auth/register/route.ts:23`, `app/(main)/posts/actions.ts:41,63`
**Severity:** low
**Issue:** The plan explicitly required Zod 4's `flattenError()` (`.flatten()` is the deprecated Zod 3 alias in Zod 4). It works today, but the template's code will be copied to ~30 apps and should pin the canonical API.
**Fix:** `parsed.error.flattenError().fieldErrors` in all four call sites.

### IN-05: Login page mislabels non-401/409 responses as network failure

**Fixed in:** `9e3e7a6` (400 now gets the same generic "Check your details" copy as 401)

**File:** `app/(auth)/login/page.tsx:49-53`
**Severity:** low
**Issue:** Any response that is not `ok` and not 401 falls into the network-error branch and shows "Couldn't reach the server. Try again." A 400 (reachable if client-side validation is bypassed or the schema evolves) would display misleading copy.
**Fix:** `if (res.status === 400) { setServerError("Check your details and try again."); return; }` before the network-failure fallback.

---

_Reviewed: 2026-08-02_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
