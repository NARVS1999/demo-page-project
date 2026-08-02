---
phase: 03-ecommerce-app
reviewed: 2026-08-02T15:29:01Z
depth: standard
files_reviewed: 50
files_reviewed_list:
  - "__tests__/mock.test.ts"
  - "__tests__/shop-ui.test.tsx"
  - "__tests__/shop.test.ts"
  - "__tests__/validate.test.ts"
  - "app/(main)/orders/[id]/error.tsx"
  - "app/(main)/orders/[id]/loading.tsx"
  - "app/(main)/orders/[id]/not-found.tsx"
  - "app/(main)/orders/[id]/page.tsx"
  - "app/(main)/shop/[slug]/error.tsx"
  - "app/(main)/shop/[slug]/loading.tsx"
  - "app/(main)/shop/[slug]/not-found.tsx"
  - "app/(main)/shop/[slug]/page.tsx"
  - "app/(main)/shop/actions.ts"
  - "app/(main)/shop/cart/error.tsx"
  - "app/(main)/shop/cart/loading.tsx"
  - "app/(main)/shop/cart/page.tsx"
  - "app/(main)/shop/checkout/error.tsx"
  - "app/(main)/shop/checkout/loading.tsx"
  - "app/(main)/shop/checkout/page.tsx"
  - "app/(main)/shop/error.tsx"
  - "app/(main)/shop/loading.tsx"
  - "app/(main)/shop/page.tsx"
  - "app/admin/emails/page.tsx"
  - "app/admin/orders/actions.ts"
  - "app/admin/orders/error.tsx"
  - "app/admin/orders/loading.tsx"
  - "app/admin/orders/page.tsx"
  - "components/admin/order-filters.tsx"
  - "components/admin/orders-table.tsx"
  - "components/layout/admin-shell.tsx"
  - "components/layout/mobile-nav.tsx"
  - "components/layout/site-header.tsx"
  - "components/shop/cart-table.tsx"
  - "components/shop/checkout-form.tsx"
  - "components/shop/order-confirmation.tsx"
  - "components/shop/product-card.tsx"
  - "components/shop/product-detail.tsx"
  - "components/shop/product-filters.tsx"
  - "db/migrations/004_ecommerce.sql"
  - "lib/mock/email.ts"
  - "lib/mock/index.ts"
  - "lib/mock/maps.ts"
  - "lib/mock/oauth.ts"
  - "lib/mock/payment.ts"
  - "lib/mock/sms.ts"
  - "lib/mock/storage.ts"
  - "lib/shop.ts"
  - "lib/site.ts"
  - "lib/validate.ts"
  - "scripts/seed.ts"
findings:
  critical: 3
  warning: 4
  info: 0
  total: 7
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-08-02T15:29:01Z
**Depth:** standard
**Files Reviewed:** 50
**Status:** issues_found

## Summary

The phase has three blocker-level correctness/security issues: concurrent cart additions can violate stock, the guest return target is not safely constrained, and the admin UI omits a required paid-order cancellation path. Four additional warnings affect seed data safety, lifecycle messaging, cart usability, and accessibility.

## Narrative Findings (AI reviewer)

## Critical Issues

### BL-01: Concurrent cart additions can exceed inventory

**Severity:** BLOCKER
**File:** `app/(main)/shop/actions.ts:84-123`
**Issue:** `getProductInventory` locks only the product row (`FOR UPDATE OF p`) while reading `ci.quantity` through a non-locked left join. The subsequent `ON CONFLICT` update unconditionally adds the requested quantity. Concurrent adds for the same user/product can therefore both validate against the same stale cart quantity and commit a cart quantity greater than current inventory, violating the no-over-stock/inline-error contract.
**Fix:** After locking the product, read and lock the existing cart row in a new statement (and handle the missing-row case), or make the insert/upsert conditional on `cart_items.quantity + $requested <= products.inventory` and return a stock error when no row is changed. Add a concurrent-add regression test.

### BL-02: Unsafe guest return target enables an open redirect

**Severity:** BLOCKER
**File:** `app/(main)/shop/actions.ts:74-76,104` (helper: `lib/utils.ts:11-15`)
**Issue:** The action accepts an attacker-controlled `next` value and passes it through a helper that rejects `//` but accepts `/\\evil.com`. URL normalization treats that backslash form as a network-path URL; after login, the existing login page calls `router.push(safeNextUrl(next))`, allowing navigation to an attacker origin. The query value is also embedded without URL encoding.
**Fix:** Harden `safeNextUrl` with origin-aware URL parsing (`new URL(value, trustedOrigin).origin === trustedOrigin`), reject backslashes/control characters, and encode `next` with `encodeURIComponent` when constructing the login URL. Add a `/\\evil.com` regression test.

### BL-03: Paid orders cannot be cancelled through the admin UI

**Severity:** BLOCKER
**File:** `components/admin/orders-table.tsx:130-135`
**Issue:** The backend permits cancellation from both `paid` and `preparing`, but the `paid` branch renders only `Start preparing`; `CancelOrderDialog` is never mounted for paid rows. A required paid-order refund/restock workflow is therefore inaccessible through the normal dashboard even though the server action supports it.
**Fix:** Render `CancelOrderDialog` alongside `TransitionDialog` in the `paid` branch, retain it for `preparing`, and add a UI test asserting the cancel control for both states.

## Warnings

### WR-01: Re-running seed destructively rewrites mutable commerce state

**Severity:** WARNING
**File:** `scripts/seed.ts:786-803,815-821,844-853`
**Issue:** A normal `npm run seed` resets product inventory and payment/order statuses with `ON CONFLICT DO UPDATE`, then recreates the demo cart row. After a real checkout or cancellation in the demo, another supported seed run can restore stock, change historical lifecycle/payment state, and repopulate a cart, making inventory and order history inconsistent.
**Fix:** Keep fixture creation idempotent without overwriting mutable inventory/status/cart state, or make destructive reset behavior an explicit separate command/flag for a disposable demo database.

### WR-02: Lifecycle messaging claims success/readiness for cancelled or merely paid orders

**Severity:** WARNING
**File:** `app/(main)/shop/actions.ts:305-309`; `components/shop/order-confirmation.tsx:19-27,78-80`
**Issue:** The post-checkout receipt says the order “is ready” while every new order is created as `paid`, before admin preparation. If that order is later cancelled, the owner page still says “Order confirmed” and “Thanks for your order” and does not surface the refunded payment status, despite querying it.
**Fix:** Make receipt and confirmation copy depend on lifecycle/payment state: use received/preparing wording for `paid`/`preparing`, ready wording only for `ready`, and show cancellation/refund messaging for `cancelled` orders.

### WR-03: Cart page omits the aggregate subtotal

**Severity:** WARNING
**File:** `app/(main)/shop/cart/page.tsx:53-58`
**Issue:** The cart renders per-line totals but the action bar contains only navigation buttons; there is no subtotal/total before the user proceeds to checkout. This misses the documented cart summary contract and makes the cart review incomplete.
**Fix:** Compute `items.reduce((sum, item) => sum + item.lineTotalCents, 0)` on the server and render a formatted subtotal beside the checkout CTA.

### WR-04: Quantity inputs reference a missing ARIA description in the normal state

**Severity:** WARNING
**File:** `components/shop/cart-table.tsx:75-86,103-107`
**Issue:** Every quantity input sets `aria-describedby="cart-error-{productId}"`, but that element is rendered only after an error. Assistive technology receives a reference to a nonexistent node for every valid cart row, and there is no normal-state hint target.
**Fix:** Render a stable hint/error element for each row, or set `aria-describedby` only when `stockMessage` exists and otherwise omit it.

## Fix Resolutions

All seven blocker/warning findings were addressed in fixer iteration 1. The original `status: issues_found` metadata is retained as the historical reviewer result; the authoritative per-finding report is `REVIEW-FIX.md`.

| Finding | Resolution | Commit |
| --- | --- | --- |
| BL-01 | Serialized product/cart locks for stock validation; added regression coverage. | `8ac7966` |
| BL-02 | Hardened same-origin return-target validation and encoded login targets; added backslash regression coverage. | `edae583` |
| BL-03 | Exposed cancellation alongside preparation for paid admin orders; expanded UI coverage. | `091059a` |
| WR-01 | Preserved mutable inventory, lifecycle/payment state, order snapshots, email state, and cart edits on seed reruns. | `e8de2a7` |
| WR-02 | Made receipts and owner confirmation copy lifecycle/payment aware, including refund messaging. | `d41f258` |
| WR-03 | Added the server-computed aggregate cart subtotal beside checkout. | `7f0b3b2` |
| WR-04 | Omitted the quantity input description reference until a stock error exists. | `b5467f8` |

**Verification:** Focused shop tests passed (24 tests), `tsc --noEmit` passed, lint passed with 11 pre-existing warnings and no errors, and the production build passed with dummy valid environment variables. A build without required environment variables still fails during page-data collection as expected.

---

_Reviewed: 2026-08-02T15:29:01Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
