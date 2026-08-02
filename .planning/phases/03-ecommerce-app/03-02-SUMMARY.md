---
phase: 03-ecommerce-app
plan: 02
subsystem: ui
tags: [nextjs, react, tailwind, shadcn, server-components, accessibility]

# Dependency graph
requires:
  - phase: 03-ecommerce-app
    provides: "03-01 shop schema, typed contracts, authenticated cart/checkout actions, order lifecycle action, seed data, and receipt linkage"
provides:
  - "Public Northstar catalog with server-rendered category/price filters and slug detail pages"
  - "Authenticated persistent cart, counter-pickup checkout, retryable payment failure, and owner-scoped order confirmation"
  - "Newest-first admin order queue with legal lifecycle controls and order-linked receipt references in the existing email outbox"
affects: [phase-04-portfolio-shell]

# Tech tracking
tech-stack:
  added: []
  patterns: ["force-dynamic server reads", "useActionState mutation boundaries", "GET filter forms", "owner-scoped notFound", "requestSubmit destructive dialogs"]

key-files:
  created: [app/(main)/shop/page.tsx, app/(main)/shop/[slug]/page.tsx, app/(main)/shop/cart/page.tsx, app/(main)/shop/checkout/page.tsx, app/(main)/orders/[id]/page.tsx, app/admin/orders/page.tsx, components/shop/product-card.tsx, components/shop/cart-table.tsx, components/shop/checkout-form.tsx, components/shop/order-confirmation.tsx, components/admin/orders-table.tsx, __tests__/shop-ui.test.tsx]
  modified: [lib/site.ts, components/layout/site-header.tsx, components/layout/mobile-nav.tsx, components/layout/admin-shell.tsx, app/admin/emails/page.tsx]

key-decisions:
  - "Keep catalog and order reads in server components, while client components own only pending state, toast feedback, refresh, and navigation."
  - "Treat malformed, unauthenticated, unknown, and non-owned order ids as one styled not-found response to preserve owner isolation."
  - "Use the existing AdminShell and email outbox as the single order-management/receipt surface; no second inbox or role model was introduced."

patterns-established:
  - "Every new database-reading route exports force-dynamic and has loading/error/not-found/empty coverage where applicable."
  - "Lifecycle controls are rendered only for legal next states; cancellation uses an AlertDialog requestSubmit intercept and explicit refund/restock copy."

requirements-completed: [SHOP-01, SHOP-02, SHOP-03, SHOP-04, SHOP-05, SHOP-06, SHOP-07]

coverage:
  - id: D1
    description: "Public Northstar catalog, allowlisted server GET filters, slug detail, and login-gated add-to-cart"
    requirement: SHOP-01
    verification:
      - kind: automated_ui
        ref: "__tests__/shop-ui.test.tsx — catalog components and route contracts"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: true
    rationale: "Visual hierarchy, dark-mode contrast, and 320px/375px overflow require a real browser viewport."
  - id: D2
    description: "Persistent cart, counter-pickup checkout, visible failure simulation, and owner order confirmation"
    requirement: SHOP-03
    verification:
      - kind: automated_ui
        ref: "__tests__/shop-ui.test.tsx — cart, checkout, and confirmation components"
        status: pass
      - kind: unit
        ref: "__tests__/shop.test.ts — checkout and cart action contracts"
        status: pass
    human_judgment: true
    rationale: "The end-to-end retry/success flow and owner isolation must be exercised with the seeded demo account in a browser."
  - id: D3
    description: "Admin order filters, legal lifecycle dialogs, shell navigation, and receipt links"
    requirement: SHOP-05
    verification:
      - kind: automated_ui
        ref: "__tests__/shop-ui.test.tsx — admin order action visibility and route/link contracts"
        status: pass
      - kind: other
        ref: "npm run lint && npx tsc --noEmit"
        status: pass
    human_judgment: true
    rationale: "Dialog focus, destructive confirmation, responsive table behavior, and receipt navigation need browser review."

# Metrics
duration: 40min
completed: 2026-08-02
status: complete
---

# Phase 3 Plan 2: Ecommerce UI Summary

**Northstar Coffee now runs from public catalog and filtered product detail through persistent cart, mock checkout, owner confirmation, admin order operations, and linked receipt outbox rows.**

## Performance

- **Duration:** ~40 minutes
- **Started:** 2026-08-02T14:30:30Z
- **Completed:** 2026-08-02T15:10:59Z
- **Tasks:** 3
- **Files modified:** 35

## Accomplishments

- Added force-dynamic `/shop` and `/shop/[slug]` routes with allowlisted category/price GET filters, realistic product cards, login-return add forms, sold-out states, and complete loading/error/not-found boundaries.
- Added authenticated `/shop/cart`, `/shop/checkout`, and owner-scoped `/orders/[id]` surfaces with current-price cart rows, inline stock errors, counter-pickup identity, visible server-validated failure simulation, snapshot totals, retryable failure alerts, and simulated receipt honesty copy.
- Added newest-first `/admin/orders`, legal paid → preparing → ready/cancelled action visibility, destructive refund/restock confirmation, Shop/Orders admin navigation, and order receipt links in `/admin/emails` without regressing legacy rows.
- Added 12 behavior-focused UI tests covering catalog/detail, filters, cart, checkout, order confirmation, admin lifecycle visibility, route guards, navigation, and outbox links.

## Task Commits

1. **Task 1: Public catalog tracer** - `627f1a2` (test), `1a3afe8` (feat)
2. **Task 2: Cart, checkout, and owner confirmation** - `dc92364` (test), `813f190` (feat)
3. **Task 3: Admin order dashboard and receipt visibility** - `89bf290` (test), `3c6a413` (feat), `eeff179` (fix), `8cc7228` (fix)

## Files Created/Modified

- `app/(main)/shop/page.tsx`, `app/(main)/shop/[slug]/page.tsx` - public server-filtered catalog and detail routes.
- `components/shop/product-card.tsx`, `product-filters.tsx`, `product-detail.tsx` - catalog presentation and authenticated mutation boundary.
- `app/(main)/shop/cart/page.tsx`, `checkout/page.tsx`, `orders/[id]/page.tsx` - authenticated cart/checkout/owner reads.
- `components/shop/cart-table.tsx`, `checkout-form.tsx`, `order-confirmation.tsx` - persistent cart, retryable checkout, and snapshot proof UI.
- `app/admin/orders/page.tsx`, `components/admin/order-filters.tsx`, `components/admin/orders-table.tsx` - admin queue and lifecycle controls.
- `components/layout/admin-shell.tsx`, `components/layout/site-header.tsx`, `components/layout/mobile-nav.tsx`, `lib/site.ts` - reachable Shop/Cart/Orders navigation.
- `app/admin/emails/page.tsx` - linked order receipt references in the existing outbox.
- `__tests__/shop-ui.test.tsx` - UI behavior and route contract coverage.

## Decisions Made

- Kept all catalog/cart/order data reads server-side and passed serializable snapshots into client components; client code never authorizes price, stock, ownership, or lifecycle state.
- Used the existing nature-newspaper tokens and primitives, with square hairline product surfaces, Newsreader headings, IBM Plex Mono money/status values, and no new package or token.
- Reused the existing email outbox for order receipts and linked each order reference to `/admin/orders?order={id}`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Made Shop and Cart reachable from the actual shared header**
- **Found during:** Task 1 (public catalog tracer)
- **Issue:** The plan named `lib/site.ts`, but the existing desktop and mobile headers used local hardcoded arrays and never consumed `SITE.defaultNav`; adding only the registry entries would leave the new storefront unreachable.
- **Fix:** Added Shop and Cart to both authenticated/guest desktop and mobile navigation arrays while preserving the requested `SITE.defaultNav` entries.
- **Files modified:** `components/layout/site-header.tsx`, `components/layout/mobile-nav.tsx`, `lib/site.ts`
- **Verification:** UI navigation contract tests, production build, and route listing pass.
- **Committed in:** `1a3afe8`

**2. [Rule 3 - Blocking] Replaced a raw clear-filter anchor with Next Link**
- **Found during:** Task 1 (catalog tracer lint verification)
- **Issue:** ESLint blocked a plain `<a href="/shop">` in the client filter form under the repository's Next navigation rule.
- **Fix:** Switched the clear control to `next/link` without changing its URL or visible copy.
- **Files modified:** `components/shop/product-filters.tsx`
- **Verification:** `npm run lint` passes with zero errors.
- **Committed in:** `1a3afe8`

**3. [Rule 1 - Bug] Added explicit counter-pickup context to order confirmation**
- **Found during:** Task 2 (owner confirmation UI test)
- **Issue:** The confirmation description used “counter-pickup” but did not expose a distinct visible “Counter pickup” context row.
- **Fix:** Added a labeled Pickup detail with the exact `Counter pickup` value.
- **Files modified:** `components/shop/order-confirmation.tsx`
- **Verification:** UI test and production build pass.
- **Committed in:** `813f190`

**4. [Rule 1 - Bug] Preserved order filters for receipt-link navigation**
- **Found during:** Task 3 (admin order/outbox integration review)
- **Issue:** The admin filter component only knew about status, so an outbox link with `?order={id}` could not show its active filter or clear control.
- **Fix:** Passed the validated order filter into `OrderFilters` and included it in active-filter detection.
- **Files modified:** `app/admin/orders/page.tsx`, `components/admin/order-filters.tsx`
- **Verification:** UI tests, type-check, lint, and build pass.
- **Committed in:** `eeff179`

**5. [Rule 1 - Bug] Reused the shared image boundary for cart thumbnails**
- **Found during:** Task 3 (lint verification)
- **Issue:** A new raw cart `<img>` introduced an avoidable lint warning and bypassed the repository's existing broken-image handling.
- **Fix:** Routed cart thumbnails through `CoverImage` with product-specific alt text.
- **Files modified:** `components/shop/cart-table.tsx`
- **Verification:** UI tests and lint pass; only pre-existing warnings remain.
- **Committed in:** `8cc7228`

### Deferred Issues

- Browser-only visual sign-off (dark mode, contrast, 320px/375px overflow, dialog focus, and full seeded account flow) remains for canonical phase verification/UAT; automated UI, type-check, lint, build, and seed checks pass.
- Existing lint warnings remain in pre-Phase-3 tests/error boundaries/blog image components; no Phase 3 lint errors remain.

**Total deviations:** 5 auto-fixed (1 Rule 2, 2 Rule 3/Rule 1 UI correctness, 2 Rule 1)
**Impact on plan:** Fixes were directly required to make planned navigation, receipt filtering, accessibility context, and repository-compliant UI behavior work; no dependency or architectural scope was added.

## Verification

- `npm run test` — **PASS** (9 files, 118 tests).
- `npx tsc --noEmit` — **PASS**.
- `npm run lint` — **PASS** with 11 pre-existing warnings and zero errors.
- `npm run build` — **PASS** on Next.js 16.2.12/Turbopack; all new shop/cart/checkout/order/admin routes compiled as dynamic server-rendered routes.
- `npm run seed` twice — **PASS** from Plan 03-01; deterministic shop counts and database size remained stable under 200 MB.
- GET smoke checks against the existing dev server confirmed `/shop`, product detail, and `/admin/orders` routing; full authenticated browser flow is listed in `03-VERIFICATION.md` as human UAT.

## User Setup Required

None - existing `.env.local` values satisfied the Neon/session/mock contract and no new environment variable or service configuration was added.

## Next Phase Readiness

- All SHOP-01 through SHOP-07 implementation artifacts and automated checks are complete.
- `03-VERIFICATION.md` is the canonical phase gate; it records the passed automation and the remaining browser/dark-mode/responsive checks without advancing lifecycle state.
- Phase 4 can consume a complete Northstar storefront/admin experience, subject to the recorded human visual sign-off.

---
*Phase: 03-ecommerce-app*
*Completed: 2026-08-02*

## Self-Check: PASSED

- All storefront, cart, checkout, order, admin, test, and summary artifacts checked exist.
- All eight plan-2 task/TDD/fix commit hashes are present in git history.
