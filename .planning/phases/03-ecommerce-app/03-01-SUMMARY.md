---
phase: 03-ecommerce-app
plan: 01
subsystem: api-database-payments
tags: [postgres, neon, server-actions, zod, mock-payment, vitest]

# Dependency graph
requires:
  - phase: 02-booking-app
    provides: "withPool transaction discipline, mock payment/email services, authenticated server actions, seed runner, and admin conventions"
provides:
  - "Northstar shop schema with isolated categories, products, persistent carts, order snapshots, lifecycle status, and order-linked mock receipts"
  - "Validated authenticated cart CRUD and transaction-safe checkout success/failure contracts"
  - "Admin order transition/refund/restock action and deterministic 12-product Northstar fixtures"
affects: [03-02-ui-surfaces, phase-04-portfolio-shell]

# Tech tracking
tech-stack:
  added: []
  patterns: ["PoolClient row-lock transactions", "integer-cent order snapshots", "post-commit mock receipts", "Zod FormData normalization"]

key-files:
  created: [db/migrations/004_ecommerce.sql, lib/shop.ts, app/(main)/shop/actions.ts, app/admin/orders/actions.ts, __tests__/shop.test.ts]
  modified: [lib/validate.ts, lib/mock/email.ts, scripts/seed.ts, general-mistake.md]

key-decisions:
  - "Keep shop_categories separate from the CMS categories taxonomy so storefront filters cannot alter blog behavior."
  - "Use current locked product prices for checkout snapshots and commit failed payment events without order, inventory, or cart writes."
  - "Use deterministic Northstar ids/slugs and upserts so repeated seed runs preserve fixture counts and stay under the size gate."

patterns-established:
  - "Every multi-write checkout/cancellation path uses client.query inside withPool and never the tagged sql helper."
  - "Cart actions return generic stale-product messages, explicit quantity errors, and current-stock inline messages without clamping."

requirements-completed: [SHOP-02, SHOP-03, SHOP-05, SHOP-06, SHOP-07]

coverage:
  - id: D1
    description: "Idempotent ecommerce schema, client-safe shop contracts, and server-side input validation"
    requirement: SHOP-02
    verification:
      - kind: unit
        ref: "__tests__/validate.test.ts, __tests__/shop.test.ts"
        status: pass
      - kind: other
        ref: "npm run seed"
        status: pass
    human_judgment: false
  - id: D2
    description: "Authenticated cart CRUD and locked checkout success/failure semantics"
    requirement: SHOP-03
    verification:
      - kind: unit
        ref: "__tests__/shop.test.ts"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D3
    description: "Admin order lifecycle with atomic refund/restock and deterministic Northstar seed receipts"
    requirement: SHOP-05
    verification:
      - kind: unit
        ref: "__tests__/shop.test.ts"
        status: pass
      - kind: other
        ref: "npm run seed && npm run seed"
        status: pass
    human_judgment: false

# Metrics
duration: 18min
completed: 2026-08-02
status: complete
---

# Phase 3 Plan 1: Ecommerce Backend Summary

**Transactional Northstar Coffee catalog, persistent cart, mock checkout, order lifecycle, receipts, and idempotent fixtures are ready for UI binding.**

## Performance

- **Duration:** 18 minutes
- **Started:** 2026-08-02T14:11:56Z
- **Completed:** 2026-08-02T14:30:12Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- Added `004_ecommerce.sql` with isolated shop categories, twelve-product schema support, user-scoped carts, integer-cent orders/items, lifecycle checks, indexes, and nullable order-linked email receipts.
- Implemented authenticated cart add/update/remove actions and a PoolClient checkout transaction that locks current product data, snapshots prices, guards inventory, handles retryable payment failure, clears the cart only on success, and sends one post-commit receipt.
- Added admin paid → preparing → ready/cancelled transitions with atomic refund/restock, plus three categories, twelve realistic products, mixed order fixtures, a demo cart row, payments, and receipt rows in the seed.
- Added focused TDD coverage for validation, helper formatting, mock email linkage, checkout transaction behavior, cart stock safety, admin lifecycle, and seed invariants.

## Task Commits

1. **Task 1: End-to-end paid checkout contract** - `1a5c1bc` (test), `25683db` (feat), `30ce624` (fix)
2. **Task 2: Persistent cart and failure-safe checkout** - `d111564` (test), `4e0b11b` (feat)
3. **Task 3: Order lifecycle and Northstar seed** - `80b658e` (test), `52d2867` (feat)

## Files Created/Modified

- `db/migrations/004_ecommerce.sql` - additive shop, cart, order, and receipt-link schema.
- `lib/shop.ts` - serializable catalog/cart/order contracts and price/reference helpers.
- `lib/validate.ts` - positive quantity, checkout checkbox, and order lifecycle schemas.
- `app/(main)/shop/actions.ts` - authenticated cart and transactional checkout actions.
- `app/admin/orders/actions.ts` - legal lifecycle, refund, and restock action.
- `lib/mock/email.ts` - optional order-linked receipt persistence.
- `scripts/seed.ts` - deterministic Northstar data and expanded size report.
- `__tests__/shop.test.ts` - backend behavior and seed invariant tests.
- `general-mistake.md` - verified TS2502 entry; all mock modules now have server-only boundaries.

## Decisions Made

- Kept the ecommerce taxonomy isolated in `shop_categories` rather than reusing CMS categories.
- Made the transaction client authoritative for prices, inventory, payment, order snapshots, and cart deletion; the browser submits no trusted price.
- Kept failed mock payment events committed while returning the exact retryable failure message and leaving the cart unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected a self-referential fake transaction-client type**
- **Found during:** Task 1 (end-to-end paid checkout contract)
- **Issue:** `npx tsc --noEmit` failed with TS2502 because the test callback annotated its parameter as `typeof client` while creating that same local value.
- **Fix:** Typed the mock callback boundary independently with `unknown` and recorded the verified pattern in `general-mistake.md` entry 004.
- **Files modified:** `__tests__/shop.test.ts`, `general-mistake.md`
- **Verification:** Targeted tests and `npx tsc --noEmit` pass.
- **Committed in:** `30ce624`

**2. [Rule 2 - Missing Critical Functionality] Added server-only boundaries to mock services**
- **Found during:** Task 1 (receipt-link extension)
- **Issue:** AGENTS.md requires every `lib/mock/*` module to start with `import "server-only"`; the existing mock modules lacked the boundary.
- **Fix:** Added the boundary to the mock index and all six service modules so server persistence code cannot be bundled into client components.
- **Files modified:** `lib/mock/index.ts`, `lib/mock/email.ts`, `lib/mock/payment.ts`, `lib/mock/sms.ts`, `lib/mock/oauth.ts`, `lib/mock/maps.ts`, `lib/mock/storage.ts`
- **Verification:** Full test suite and type-check pass.
- **Committed in:** `30ce624`

**3. [Rule 1 - Bug] Preserved the quantity field key for scalar Zod errors**
- **Found during:** Task 2 (persistent cart and failure-safe checkout)
- **Issue:** `flattenError` on the scalar quantity schema returned no `quantity` field, so invalid cart quantities could lose their inline error.
- **Fix:** Mapped the first Zod issue explicitly to `errors.quantity`.
- **Files modified:** `app/(main)/shop/actions.ts`
- **Verification:** Cart validation tests, type-check, and lint pass.
- **Committed in:** `4e0b11b`

### Deferred Issues

- Existing lint warnings remain in pre-Phase-3 tests, error boundaries, and blog image components; they are recorded in `deferred-items.md` and do not affect the backend plan.

**Total deviations:** 3 auto-fixed (1 Rule 1, 1 Rule 2, 1 Rule 3)
**Impact on plan:** All fixes were required for correctness or repository security boundaries; no new dependency or architectural surface was introduced.

## Verification

- `npm run test` — **PASS** (8 files, 106 tests).
- `npx tsc --noEmit` — **PASS**.
- `npm run lint` — **PASS** with 11 pre-existing warnings and zero errors.
- `npm run seed` twice — **PASS**; migration ledger remained at 4 entries, shop rows remained at 3 categories/12 products/3 orders/5 order items, and database size remained 8.80 MB.
- General-mistake signatures were swept across changed files; no dormant `middleware.ts`, self-referential client annotation, or missing mock server boundary remains.

## User Setup Required

None - no external service configuration required; the existing `.env.local` contract was present and the configured Neon database completed both seed runs.

## Issues Encountered

- The existing STATE.md used a non-parseable compound plan label (`03-01 and 03-02 ready`), so the SDK advance handler could not move to the dependent plan. It was normalized to `Plan: 1 of 2` before invoking the handler; no application behavior was affected.

## Next Phase Readiness

- Plan 03-02 can consume `CatalogProduct`, `CartItemRow`, `OrderSummary`, `FormState`, cart/checkout actions, and `updateOrderStatus` directly.
- Seeded Neon data is ready for catalog, cart, checkout, owner confirmation, admin order, and receipt-link browser verification.
- Manual browser and responsive/dark-mode sign-off remains part of the UI plan and canonical phase verification.

---
*Phase: 03-ecommerce-app*
*Completed: 2026-08-02*

## Self-Check: PASSED

- All planned backend artifacts and the summary file exist.
- All seven task/TDD commit hashes are present in git history.
