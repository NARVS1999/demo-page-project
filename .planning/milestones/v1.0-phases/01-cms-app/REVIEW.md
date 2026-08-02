---
phase: 01-cms-app
reviewed: 2026-08-02T07:05:00Z
depth: deep
files_reviewed: 34
files_reviewed_list:
  - components/posts/delete-post-dialog.tsx
  - components/posts/posts-table.tsx
  - components/posts/editor-shell.tsx
  - components/posts/markdown-preview.tsx
  - components/posts/markdown-components.tsx
  - components/posts/tags-input.tsx
  - components/posts/cover-upload.tsx
  - components/blog/blog-card.tsx
  - components/blog/cover-image.tsx
  - components/blog/blog-search.tsx
  - components/blog/category-badge.tsx
  - components/blog/tag-chip.tsx
  - components/blog/related-posts.tsx
  - components/blog/markdown-content.tsx
  - components/admin/category-dialog.tsx
  - components/admin/tag-dialog.tsx
  - components/admin/cms-category-table.tsx
  - components/admin/cms-tag-table.tsx
  - components/layout/admin-shell.tsx
  - app/(main)/blog/page.tsx
  - app/(main)/blog/loading.tsx
  - app/(main)/blog/error.tsx
  - app/(main)/blog/[slug]/page.tsx
  - app/(main)/blog/category/[slug]/page.tsx
  - app/(main)/blog/tag/[slug]/page.tsx
  - app/(main)/blog/search/page.tsx
  - app/(main)/posts/actions.ts
  - app/(main)/posts/page.tsx
  - app/(main)/posts/new/page.tsx
  - app/(main)/posts/[id]/edit/page.tsx
  - app/admin/categories/page.tsx
  - app/admin/tags/page.tsx
  - app/admin/page.tsx
  - app/api/uploads/route.ts
  - app/globals.css
  - app/not-found.tsx
  - db/migrations/002_cms.sql
  - lib/blog.ts
  - lib/validate.ts
  - lib/site.ts
  - scripts/seed.ts
  - proxy.ts
  - lib/db.ts
  - lib/mock/storage.ts
  - __tests__/markdown.test.tsx
  - __tests__/blog.test.ts
  - __tests__/validate.test.ts
  - README.md
  - package.json
findings:
  critical: 1
  high: 1
  medium: 3
  warning: 1
  info: 6
  total: 12
status: clean
---

# Phase 01: Code Review Report — CMS App

**Reviewed:** 2026-08-02T07:05:00Z
**Depth:** deep (cross-file: import graph, action/route boundaries, migration semantics, server/client seams)
**Files Reviewed:** 34
**Status:** issues_found

## Summary

Reviewed the full Phase 1 surface: migration 002_cms, lib/blog.ts + Zod schemas, all server actions and the upload route, all five public blog pages, the shared markdown pipeline, the editor stack, the two admin taxonomy pages, seed v2, and the delete-post-dialog fix from the blocker resolution.

**The security posture is genuinely strong and verified:** every public query hard-filters `status = 'published'` (grid, article, category, tag, search, related-posts — no draft leakage vector found); all SQL is parameterized through neon tagged templates with `escapeLike` correctly neutralizing `%`/`_`/`\` for ILIKE; markdown XSS is provably mitigated (react-markdown safe defaults, zero `rehype-raw`/`dangerouslySetInnerHTML`, XSS regression test passing, `javascript:` stripped by defaultUrlTransform); IDOR posture holds (ownership-scoped `author_id` on every write and on the edit-page read, `isUuid` guards); the upload route re-verifies auth and enforces the 3 MB cap server-side; CSRF relies on the inherited proxy Origin check + SameSite=Lax. 73 tests and lint (0 errors) verified green.

**However, one critical defect was found**: the category/tag delete flows in the two admin tables use **the exact original pattern that the blocker investigation proved broken** ("form submission canceled because the form is not connected" — Radix `AlertDialogAction` auto-closes the dialog and unmounts the form before the browser processes the implicit submit). The fix was applied to the posts table only (`delete-post-dialog.tsx`) and was **not propagated to `cms-category-table.tsx` / `cms-tag-table.tsx`**, which are byte-for-byte the same structure as the pre-fix posts-table code (see `git show 0f61b1a`). Category/tag delete silently no-ops — and the 01-02 summary's retest evidence never exercised category/tag delete (only post delete and category create).

Secondary findings: a seed crash path (tag slug conflicts with user-created tags), a migration upgrade hazard (slug backfill collisions break the unique index), and a cover_image URL validation gap (non-http(s) schemes accepted — not exploitable in `<img>` on modern browsers, but a template contract that should be tightened).

---

## Critical Issues

### CR-01: Admin category/tag delete is broken — same Radix AlertDialogAction race the blocker fix resolved in delete-post-dialog

**Fixed in:** 217b7fb

**Files:**
- `components/admin/cms-category-table.tsx:172-183`
- `components/admin/cms-tag-table.tsx:166-177`

**Issue:** Both admin tables render:

```tsx
<AlertDialogFooter>
  <AlertDialogCancel>Cancel</AlertDialogCancel>
  <form action={formAction}>
    <input type="hidden" name="id" value={category.id} />
    <AlertDialogAction type="submit" disabled={pending} ...>
      {pending ? "Deleting…" : "Delete"}
    </AlertDialogAction>
  </form>
</AlertDialogFooter>
```

This is **structurally identical** to the pre-fix posts-table delete (compare `git show 0f61b1a -- components/posts/posts-table.tsx`), which the 01-02 blocker investigation proved fails with *"Form submission canceled because the form is not connected"* — Radix `AlertDialogAction` auto-closes the dialog on click, React flushes the state update synchronously, and the portal content (including the form) is detached before the browser's default action fires the form's submit event. The dialog closes, nothing is submitted, no toast, no deletion — a **silent no-op**. The fix (commit `0f61b1a`) added the `preventDefault()` + `requestSubmit()` intercept in `delete-post-dialog.tsx`, but the same fix was **never applied to the two admin tables**. The 01-02 retest evidence (headless Chrome) covered post delete and category *create*, not category/tag *delete* — the done criteria "delete flows work end-to-end" for Task 4 was not actually exercised. Deleting a category/tag therefore does nothing, and the phase's CMS-03 success criterion ("Admin can create/rename/**delete** categories and tags") is not met.

**Fix:** Extract a shared confirm-delete dialog (or replicate the intercept) in both tables — same shape as `delete-post-dialog.tsx`:

```tsx
const formRef = React.useRef<HTMLFormElement>(null);
// per-table useActionState(deleteCategory, null) + effect: state?.ok → toast + router.refresh()
<AlertDialogFooter>
  <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
  <form ref={formRef} action={formAction} aria-label="Delete category">
    <input type="hidden" name="id" value={category.id} />
    <AlertDialogAction
      type="submit"
      disabled={pending}
      onClick={(event) => {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }}
      className="bg-destructive text-white hover:bg-destructive/90"
    >
      {pending ? "Deleting…" : "Delete"}
    </AlertDialogAction>
  </form>
</AlertDialogFooter>
```

Then verify in a real browser (as was done for posts): category delete → POST 200 → row gone; tag delete → POST 200 → join rows removed.

---

## Warnings

### WR-01: delete-post-dialog gives no error feedback on failed delete

**Fixed in:** 717204a

**File:** `components/posts/delete-post-dialog.tsx:39-45`

**Issue:** The dialog renders no `state.message` (unlike `editor-shell` and the taxonomy dialogs). If `deletePost` returns `{ message: "This post no longer exists." }` (stale row, already deleted in another tab, or session expiry edge), the dialog stays open with zero feedback — the user clicks Delete repeatedly and nothing visibly happens. The failure mode is indistinguishable from a hung action.

**Fix:** Render `state.message` in a destructive `Alert` inside the dialog content when present (and don't close):

```tsx
{state?.message && (
  <Alert variant="destructive">
    <AlertDescription>{state.message}</AlertDescription>
  </Alert>
)}
```

---

## Medium Findings

### MD-01: Seed crashes with 23505 when a user-created tag slug collides with a seed tag slug

**Fixed in:** 567cb80

**File:** `scripts/seed.ts:232-237`

**Issue:** `INSERT INTO tags (id, slug, name) ... ON CONFLICT (id) DO NOTHING` only resolves id conflicts. If a demo user has created a tag with slug `design`, `markdown`, `next-js`, etc. (any of the 7 seed slugs — very plausible after following the README demo guide), the seed's fixed-id insert violates `tags_slug_key` (different id, same slug) → uncaught 23505 → `main().catch` → **seed exits non-zero**, breaking the "seed ×2 idempotent" guarantee and every downstream `npm run seed`. Categories correctly use `ON CONFLICT (slug) DO UPDATE`; tags picked the wrong conflict target ("pick one conflict target per table and stay consistent" — but id is the one that does not protect against the slug collision).

**Fix:** Use the slug as the conflict target for tags too:

```ts
await sqlDirect`
  INSERT INTO tags (id, slug, name)
  VALUES (${tag.id}, ${tag.slug}, ${tag.name})
  ON CONFLICT (slug) DO NOTHING`;
```

(Or catch 23505 per statement and continue — but the slug target is the cleaner contract.)

### MD-02: Migration 002_cms unique-index creation can fail on duplicate backfilled slugs

**Fixed in:** 1f2318a

**File:** `db/migrations/002_cms.sql:50-52`

**Issue:** The slug backfill `UPDATE posts SET slug = btrim(regexp_replace(lower(title), ...)) WHERE slug IS NULL` runs before `CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_idx`. Any two pre-CMS posts with identical (or punctuation-only) titles backfill to the same slug → the unique index creation throws a 23505 duplicate-key error → the migration run fails (and per the seed runner, the ledger entry is never written, so every subsequent `npm run seed` fails on the same statement). Phase 0 users testing CRUD by creating duplicate-named posts ("Hello World" twice) hit this on upgrade. Fresh seeded DBs are unaffected, which is why verification passed.

**Fix:** Deduplicate before indexing:

```sql
UPDATE posts p SET slug = p.slug || '-' || substr(p.id::text, 1, 8)
WHERE EXISTS (
  SELECT 1 FROM posts p2
  WHERE p2.slug = p.slug AND p2.id < p.id
);
```

(run after the backfill, before `CREATE UNIQUE INDEX`; keep it `WHERE slug IS NULL`-style guarded or wrap in a DO block for re-run safety).

### MD-03: coverImage accepts non-http(s) schemes (javascript:, data:)

**Fixed in:** e730000

**File:** `lib/validate.ts:43` (consumed by `app/(main)/posts/actions.ts` createPost/updatePost, rendered by `components/blog/cover-image.tsx`, `components/posts/cover-upload.tsx`)

**Issue:** `z.string().url()` in Zod 4 validates by parsing with `new URL()`, which accepts *any* scheme — `javascript:alert(1)`, `data:text/html,...`, `file:///etc/passwd` all pass. A crafted FormData submission (server actions accept arbitrary input; the client's file-input path is not the only path) stores such a URL in `cover_image`, and it is rendered straight into `<img src>`. This is **not exploitable today** (modern browsers do not execute `javascript:` or script-bearing SVG in `<img>`), and markdown body images are correctly protected by react-markdown's `defaultUrlTransform` — but the schema is the template-wide contract for ~30 future forks, and the value reaches a raw HTML attribute with no server-side allowlist. One future sink change (Link href, background-image, og:image in a `<meta>`... a `<meta property="og:image">` is inert, but a future `href` use would not be) turns this into stored XSS.

**Fix:** Restrict to http(s):

```ts
const httpUrl = z
  .string()
  .refine((v) => /^https?:\/\//i.test(v), "Enter a valid URL.")
  .refine((v) => {
    try { return new URL(v).protocol === "http:" || new URL(v).protocol === "https:"; }
    catch { return false; }
  }, "Enter a valid URL.");

coverImage: z.union([httpUrl, z.literal("")]).optional(),
```

---

## Info

### IN-01: Unused `Button` import on /blog page (new lint warning)

**Fixed in:** 9c11dde

**File:** `app/(main)/blog/page.tsx:12` — `Button` is imported but the empty state intentionally has no CTA. The 8 lint warnings include this one as genuinely new (the others are pre-existing or intentional: error-boundary `_error` param, deliberate plain `<img>` per UI-SPEC). Remove the import.

### IN-02: Punctuation-only title produces an empty, unreachable slug

**Fixed in:** 89f4fd1

**File:** `app/(main)/posts/actions.ts:71` (`finalSlug = slug || slugify(title)`)

A title of 3+ non-alphanumeric characters (e.g. `!!!`) passes `min(3)` but `slugify` returns `""` → the post is stored with `slug = ''` — published but unreachable at any `/blog/...` URL, and it also claims the single `''` slot in the unique index (the second such post gets a confusing "A post with this slug already exists."). Consider rejecting empty `finalSlug` (field error) or generating a fallback slug from the id.

### IN-03: Side effect inside a state updater (tags-input)

**File:** `components/posts/tags-input.tsx:28-37` — `setLocalError` is called inside the `setTags` updater. React may double-invoke updaters in StrictMode dev; it is idempotent here, but it violates the pure-updater rule and is fragile. Move the `setLocalError` calls out of the updater (compute next tags first, then set both states).

### IN-04: Redundant `SELECT DISTINCT` on /blog/search

**File:** `app/(main)/blog/search/page.tsx:28` — with `GROUP BY p.id` (functional dependency collapses the join fan-out), every group is already unique; `DISTINCT` is a no-op. Harmless, but the comment claims DISTINCT is the dedupe mechanism, which misleads future readers.

### IN-05: Upload route buffers the full body before the size check; `size_bytes` is base64 length

**Files:** `app/api/uploads/route.ts:20-32`, `lib/mock/storage.ts:19` — `request.formData()` materializes the entire multipart body in memory before `file.size > MAX_BYTES` is evaluated; the 3 MB cap is therefore not a memory bound (the Vercel 4.5 MB function body limit is the real one — this matches the documented RESEARCH rationale, so it's acceptable, but worth noting). Also `storage.upload` records `data.length` (base64 chars ≈ 4/3 × bytes) as `size_bytes` — metadata-only mock, cosmetic.

### IN-06: Dropdown menu stays open behind the delete/rename dialogs

**Files:** `components/admin/cms-category-table.tsx:146-151`, `components/admin/cms-tag-table.tsx:141-146`, `components/posts/posts-table.tsx:147-153` — `onSelect={(e) => e.preventDefault()}` keeps the row's `DropdownMenu` open while the AlertDialog/Dialog opens on top; after closing the dialog the menu is still open (and for a deleted row, still shows "Delete" until the refresh lands). Minor UX roughness; closing the menu on trigger click (`onSelect` without preventDefault, or closing on dialog open) is cleaner.

---

_Reviewed: 2026-08-02T07:05:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
