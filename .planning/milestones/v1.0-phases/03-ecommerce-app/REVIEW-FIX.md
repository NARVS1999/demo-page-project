---
phase: 03-ecommerce-app
fixed_at: 2026-08-02T16:32:53Z
review_path: .planning/phases/03-ecommerce-app/REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-08-02T16:32:53Z
**Source review:** `.planning/phases/03-ecommerce-app/REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### BL-01: Concurrent cart additions can exceed inventory

**Files modified:** `app/(main)/shop/actions.ts`, `__tests__/shop.test.ts`
**Commit:** `8ac7966`
**Status:** fixed: requires human verification
**Applied fix:** Product rows are locked first, then the matching cart row is read and locked; missing cart rows safely use quantity zero. Added a lock-order regression test.

### BL-02: Unsafe guest return target enables an open redirect

**Files modified:** `lib/utils.ts`, `app/(main)/shop/actions.ts`, `__tests__/shop.test.ts`
**Commit:** `edae583`
**Status:** fixed: requires human verification
**Applied fix:** Return targets now reject backslashes/control characters and cross-origin URL normalization, and login targets are URL-encoded. Added the `/\\evil.com` regression case.

### BL-03: Paid orders cannot be cancelled through the admin UI

**Files modified:** `components/admin/orders-table.tsx`, `__tests__/shop-ui.test.tsx`
**Commit:** `091059a`
**Status:** fixed: requires human verification
**Applied fix:** Paid rows now render both preparation and cancellation actions; the UI test covers cancellation controls for paid and preparing rows.

### WR-01: Re-running seed destructively rewrites mutable commerce state

**Files modified:** `scripts/seed.ts`, `__tests__/shop.test.ts`
**Commit:** `e8de2a7`
**Status:** fixed: requires human verification
**Applied fix:** Seed reruns preserve inventory, payment/order/email statuses, order snapshots, and cart edits. The initial walkthrough cart is inserted only before demo orders establish the initialization marker.

### WR-02: Lifecycle messaging claims success/readiness for cancelled or merely paid orders

**Files modified:** `app/(main)/shop/actions.ts`, `components/shop/order-confirmation.tsx`, `__tests__/shop.test.ts`, `__tests__/shop-ui.test.tsx`
**Commit:** `d41f258`
**Status:** fixed: requires human verification
**Applied fix:** Receipts and owner confirmations now distinguish received, preparing, ready, and cancelled/refunded states and display payment status.

### WR-03: Cart page omits the aggregate subtotal

**Files modified:** `app/(main)/shop/cart/page.tsx`, `__tests__/shop-ui.test.tsx`
**Commit:** `7f0b3b2`
**Status:** fixed
**Applied fix:** The server cart page computes the line-total subtotal and renders it beside the checkout CTA.

### WR-04: Quantity inputs reference a missing ARIA description in the normal state

**Files modified:** `components/shop/cart-table.tsx`, `__tests__/shop-ui.test.tsx`
**Commit:** `b5467f8`
**Status:** fixed
**Applied fix:** `aria-describedby` is omitted until a stock error element exists; the normal-row accessibility test asserts the reference is absent.

## Verification

- Focused Vitest: `__tests__/shop.test.ts` and `__tests__/shop-ui.test.tsx` — 24 passed.
- Typecheck: `tsc --noEmit` — passed.
- Lint: `npm run lint` — passed with 11 pre-existing warnings, 0 errors.
- Build: `npm run build` with dummy valid environment variables — passed.
- Build without environment variables remains expected to fail during page-data collection because `DATABASE_URL`, `DATABASE_URL_DIRECT`, and `SESSION_SECRET` are required.

---

_Fixed: 2026-08-02T16:32:53Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
