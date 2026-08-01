---
phase: 01-cms-app
fixed_at: 2026-08-02T07:10:00Z
review_path: .planning/phases/01-cms-app/REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-08-02T07:10:00Z
**Source review:** `.planning/phases/01-cms-app/REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (CR-01, WR-01, MD-01, MD-02, MD-03, IN-01, IN-02)
- Fixed: 7
- Skipped: 0

**Verification (post-fix, in isolated worktree):**
- `npx tsc --noEmit` — 0 errors
- `npm run lint` — 0 errors, 7 warnings (all pre-existing/intentional per REVIEW.md: `_error` unused params, deliberate plain `<img>` per UI-SPEC, `_args`/`_drop` test fixtures)
- `npm run test` — 76/76 passed (73 baseline + 3 new MD-03 cases in `__tests__/validate.test.ts`)
- `npm run build` — compiled successfully, TypeScript clean, all 7 static/dynamic pages generated (DB routes stay `ƒ` dynamic)

## Fixed Issues

### CR-01: Admin category/tag delete is broken — same Radix AlertDialogAction race the blocker fix resolved in delete-post-dialog

**Files modified:** `components/admin/cms-category-table.tsx`, `components/admin/cms-tag-table.tsx`
**Commit:** 217b7fb
**Applied fix:** Extracted per-row `DeleteCategoryDialog` / `DeleteTagDialog` components replicating `delete-post-dialog.tsx` exactly (same comment, structure, aria-label): each dialog owns its `useActionState`, local `open` state, and `formRef`; the `AlertDialogAction` click is intercepted with `event.preventDefault()` + `formRef.current?.requestSubmit()` so the form submits while the dialog is still mounted; the dialog closes only on `state?.ok` via the `setTimeout(0)` pattern (avoids setState-in-effect lint error) and refreshes the router + toasts. Removed the table-level shared `useActionState`/effect. Rename (pencil) flow untouched.

### WR-01: delete-post-dialog gives no error feedback on failed delete

**File:** `components/posts/delete-post-dialog.tsx`
**Commit:** 717204a
**Applied fix:** `deletePost` returns `{ message: ... }` on failure ("This post no longer exists.", "Missing post id.") — the dialog now renders `state?.message` in a destructive `Alert` (same pattern as category-dialog.tsx) between the header and the footer, and stays open on failure.

### MD-01: Seed crashes with 23505 when a user-created tag slug collides with a seed tag slug

**File:** `scripts/seed.ts`
**Commit:** 567cb80
**Applied fix:** Tags upsert changed from `ON CONFLICT (id) DO NOTHING` to `ON CONFLICT (slug) DO NOTHING` (unique index on `tags.slug` confirmed in `db/migrations/002_cms.sql`). A user-created tag with a colliding slug now causes the seed's fixed-id insert to be skipped instead of crashing with 23505. Matches the `persistTags` conflict contract.

### MD-02: Migration 002_cms unique-index creation can fail on duplicate backfilled slugs

**File:** `db/migrations/002_cms.sql`
**Commit:** 1f2318a
**Applied fix:** Added a dedupe statement between the slug backfill and `CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_idx`: later rows of each duplicate slug group get `-` + first 8 chars of their id appended (`p2.id < p.id` keeps the earliest row's slug). Self-guarding via the `WHERE EXISTS` clause (no-op when no duplicates) so the migration stays idempotent/re-runnable; statements keep the `;\n` terminator the seed runner splits on.

### MD-03: coverImage accepts non-http(s) schemes (javascript:, data:)

**Files modified:** `lib/validate.ts`, `__tests__/validate.test.ts`
**Commit:** e730000
**Applied fix:** `postSchema.coverImage` now uses an `httpUrl` schema: `z.string().url(...)` + `.refine(/^https?:\/\//i)` — non-http(s) schemes are rejected with the standard "Enter a valid URL." copy; `""` still accepted via the `z.literal("")` union member. Added 3 TDD tests: rejects `javascript:`, rejects `data:`, accepts `http://` (76 total tests pass).

### IN-01: Unused `Button` import on /blog page (new lint warning)

**File:** `app/(main)/blog/page.tsx`
**Commit:** 9c11dde
**Applied fix:** Removed the unused `Button` import.

### IN-02: Punctuation-only title produces an empty, unreachable slug

**File:** `app/(main)/posts/actions.ts`
**Commit:** 89f4fd1
**Applied fix:** Both `createPost` and `updatePost` now compute `finalSlug = slug || slugify(title) || "post"` — a punctuation-only title can no longer store an empty slug (which was unreachable at any `/blog/...` URL and claimed the unique `''` slot).

## Skipped Issues

None — all 7 in-scope findings were fixed.

**Out of scope (not requested):** IN-03 (tags-input setState-in-updater), IN-04 (redundant `SELECT DISTINCT` comment), IN-05 (upload body buffering — accepted per RESEARCH rationale), IN-06 (dropdown stays open behind dialog — minor UX). These remain open in REVIEW.md.

---

_Fixed: 2026-08-02T07:10:00Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
