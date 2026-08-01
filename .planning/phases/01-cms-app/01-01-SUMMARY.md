---
phase: 01-cms-app
plan: 01-01
plan_name: "Schema + data layer — 002_cms migration, lib/blog.ts + Zod schemas (TDD), extended post/taxonomy actions, upload route"
status: complete
subsystem: data-layer
tags: [migration, tdd, zod, server-actions, uploads, taxonomy]
requires: []
provides: [002_cms schema, lib/blog.ts, extended postSchema/categorySchema/tagSchema, extended post actions, taxonomy actions, POST /api/uploads, escapeLike contract]
affects: [app/(main)/posts/*, scripts/seed.ts, lib/validate.ts, components/posts/posts-table.tsx, components/posts/post-form.tsx]
tech-stack:
  added: []
  patterns:
    - "Idempotent ledger-guarded migration (IF [NOT] EXISTS + WHERE-guarded backfills)"
    - "23505 unique-violation catch → UI-SPEC alert copy (never a raw 500)"
    - "Client-safe pure helper module (lib/blog.ts) shared by server pages + browser editor"
    - "z.preprocess maps '' → undefined/null so form fallbacks stay reachable"
    - "Ownership-scoped SQL (AND author_id) on every post write; auth re-check in every action + route"
key-files:
  created: [db/migrations/002_cms.sql, lib/blog.ts, __tests__/blog.test.ts, app/api/uploads/route.ts]
  modified: [scripts/seed.ts, lib/validate.ts, __tests__/validate.test.ts, app/(main)/posts/actions.ts, app/(main)/posts/page.tsx, app/(main)/posts/[id]/edit/page.tsx, components/posts/posts-table.tsx, components/posts/post-form.tsx, .planning/phases/01-cms-app/01-UI-SPEC.md]
decisions:
  - "Unique slug enforcement via CREATE UNIQUE INDEX (ledger-safe) instead of ADD CONSTRAINT — same 23505 code"
  - "published_at set to now() on every published save, NULL when reverted to draft (simple rule per RESEARCH)"
  - "Tags persistence is delete-and-reinsert, non-atomic (single-user demo — RESEARCH Open Question 2)"
  - "UI-SPEC upload copy amended 4 MB → 3 MB per RESEARCH Pitfall 1 (3 occurrences)"
metrics:
  duration: 1h 12m
  completed_date: "2026-08-01"
status: complete
---

# Phase 01 Plan 1: Schema + Data Layer Summary

**One-liner:** Ledger-idempotent CMS schema migration (categories/tags/post_tags + posts status/slug/category/cover/published_at), TDD client-safe pure helpers (slugify/escapeLike/parseTags/readingTime/excerpt), extended Zod schemas, extended posts actions + six taxonomy actions with 23505 catches, and the mock-storage upload route with a 3 MB server-side cap.

## Tasks

| Task | Name | Type | Commit(s) | Verification |
|------|------|------|-----------|--------------|
| 1 | 002_cms.sql migration + published→status across 7 touchpoints | execute | `81be3b0` | seed ×2 (applied/skipped), build, tsc, lint, test, grep gate |
| 2 | TDD lib/blog.ts pure helpers | tdd | `3097247` (RED), `fb443ac` (GREEN) | 21/21 helper tests pass; no server-only import |
| 3 | TDD extended postSchema + categorySchema/tagSchema | tdd | `068ab7d` (RED), `8f2047e` (GREEN) | 29/29 validate tests pass |
| 4 | Extended actions + taxonomy + /api/uploads + UI-SPEC amendment | execute | `7489ca5` | build, tsc, lint, test; runtime: uploads 401/201/400/413 matrix |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Grep gate literal vs. mandated enum string values**
- **Found during:** Task 1 (Step J)
- **Issue:** The plan's gate `grep -rnE "\bpublished\b" app components scripts lib __tests__` returns 10 matches — but every match is the *new status enum value* `"published"` (SQL literal, `<option value="published">`, `status: "published"` seed data, `z.enum([...])`), which the plan itself mandates (Step C, migration CHECK constraint). The removed boolean's *identifier* usage is zero.
- **Fix:** Ran the precise gate for old-boolean references (`\.published\b|published[=:]|WHERE published|SET published`) → zero matches. The word-boundary gate as literally written is unsatisfiable by design.
- **Files modified:** none (verification method)
- **Commit:** n/a (documented only)

**2. [Rule 1 - Bug] tsc type error — PostForm prop type widened**
- **Found during:** Task 4 verification
- **Issue:** After the Task 3 schema extension, `PostInput` (z.infer) requires `tags: string[]`; the edit page passed a row typed `status: string`.
- **Fix:** Typed the row `status: "draft" | "published"` and passed `tags: []` to the interim PostForm (which 01-02 Task 3 replaces wholesale).
- **Files modified:** `app/(main)/posts/[id]/edit/page.tsx`
- **Commit:** `7489ca5`

## Verification Results

- `npm run seed` twice: first logs `002_cms — applied`, second `002_cms — already applied, skipping`; report includes categories/tags/post_tags counts; 7.87 MB < 200 MB gate ✓
- `npm run build`, `npx tsc --noEmit`, `npm run lint` (0 errors), `npm run test` (69 tests, 5 files) all green ✓
- Grep gate (old boolean identifier): zero matches ✓
- Runtime (dev server): POST /api/uploads no session → 401; small image → 201 `{url,size}`; text file → 400; >3 MB → 413 ✓
- `/posts`: 307 without session, 200 with session, all seeded posts render "Published" badge ✓

## Deferred Items

- **Duplicate-slug alert runtime check (Task 4 done criteria):** the 23505 catch is code-verified and the unique index is proven live (seed), but the form-level duplicate-slug → destructive Alert flow needs the editor UI — deferred to 01-02 Task 3 e2e verification.
- **Stale-post "This post no longer exists." branch:** existing inherited behavior, unchanged; exercised in 01-02 editor tests.

## Known Stubs

- `components/posts/post-form.tsx` status control is an **intentional interim** select (plan Step I) — replaced wholesale by `editor-shell` in 01-02 Task 3. Do not polish.

## TDD Gate Compliance

- Task 2: `test(...)` commit `3097247` precedes `feat(...)` commit `fb443ac` ✓
- Task 3: `test(...)` commit `068ab7d` precedes `feat(...)` commit `8f2047e` ✓
- REFACTOR phases were no-ops (helpers/schemas already clean); shared `slugRegex` const extracted inline in the GREEN commit of Task 3.

## Self-Check: PASSED

- Files exist: `db/migrations/002_cms.sql`, `lib/blog.ts`, `__tests__/blog.test.ts`, `app/api/uploads/route.ts` ✓
- Commits exist: `81be3b0`, `3097247`, `fb443ac`, `068ab7d`, `8f2047e`, `7489ca5` ✓
