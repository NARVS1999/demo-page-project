---
status: passed
phase: 03-ecommerce-app
source: [03-VERIFICATION.md, REVIEW.md, REVIEW-FIX.md]
started: 2026-08-02T15:10:59Z
updated: 2026-08-02T16:59:14Z
---

## Current Test

number: 4
name: Dark mode, keyboard, and narrow viewport backstops
expected: |
  The seeded catalog shows twelve products, allowlisted filters update the URL
  and server-rendered results, product detail has one price/quantity with no
  variants, signed-out add returns to the product login target, and an unsafe
  backslash return target stays on the same origin after sign-in.
awaiting: complete — user reported all four checks passed

## Review-Fix Regression Notes

The automated re-verification independently confirmed all seven review fixes:

- BL-01: product and matching cart rows are locked before add stock validation.
- BL-02: unsafe/backslash/cross-origin return targets are rejected and login
  targets are URL-encoded.
- BL-03: paid and preparing orders both expose the cancellation control.
- WR-01: seed reruns preserve mutable inventory, lifecycle/payment state, order
  snapshots, email rows, and cart edits.
- WR-02: owner receipt/confirmation copy reflects lifecycle and refund state.
- WR-03: the cart displays a server-computed subtotal.
- WR-04: normal quantity rows do not reference a missing ARIA error node.

These notes are automated/source evidence, not a substitute for the browser
checks below.

## Tests

### 1. Catalog, filters, login-gated add, and return-target backstop

**Test:** With the seeded database and dev server running, visit `/shop`, verify
12 products, switch Drinks/Beans/Bakery and each price band, open a product
detail, try Add to cart signed out, and optionally visit
`/login?next=%2F%5Cevil.com` before signing in.
**Expected:** GET filters update the URL and results; detail shows one price and
quantity; guest add returns to `/login?next=/shop/{slug}`; the unsafe target
does not navigate off the app origin.
result: [passed]

### 2. Cart subtotal and checkout failure/retry/success

**Test:** Sign in as `demo@example.com` / `demo1234`, use the demo cart or add a
product, update quantity, submit checkout with Simulate payment failure checked,
then retry unchecked. Do not reseed between submissions.
**Expected:** The subtotal is visible; over-stock errors stay inline without
clamping; failed payment stays on checkout and leaves the cart unchanged;
success navigates to `/orders/{id}` with snapshot line items, totals, pickup
context, lifecycle-aware copy, and the simulated receipt note.
result: [passed]

### 3. Owner isolation and admin lifecycle

**Test:** Open an order as the owner and a different authenticated user. In
`/admin/orders`, filter Paid and Preparing, advance one order, cancel another
paid/preparing order, and follow a receipt link from `/admin/emails`.
**Expected:** Non-owner sees the same styled not-found response; paid rows show
Start preparing and Cancel order; preparing rows show Mark ready and Cancel
order; cancellation confirms refund/restock and refreshes status; receipt links
land on the matching order filter.
result: [passed]

### 4. Dark mode, keyboard, and narrow viewport backstops

**Test:** Repeat catalog, cart, checkout, confirmation, admin, and outbox
screens in light and dark themes at 320px and 375px. Tab through filters,
quantity controls, checkbox, dialogs, and action buttons.
**Expected:** No page-level horizontal overflow; readable semantic status/error
text without color alone; pending controls visibly disable; dialog focus stays
trapped and dismissible.
result: [passed]

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- User reported all four browser checks passed, including responsive, dark-mode,
  keyboard, and end-to-end flow behavior.
- Seed reruns preserve mutable state after orders exist; use the existing demo
  cart or add a product before the checkout test, and do not reseed between
  failure and success submissions.
