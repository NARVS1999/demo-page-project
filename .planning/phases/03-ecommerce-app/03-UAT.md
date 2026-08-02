---
status: testing
phase: 03-ecommerce-app
source: [03-VERIFICATION.md]
started: 2026-08-02T15:10:59Z
updated: 2026-08-02T15:10:59Z
---

## Current Test

number: 1
name: Catalog, filters, and login-gated add
expected: |
  The seeded catalog shows twelve products, allowlisted filters update the URL
  and server-rendered results, product detail has one price/quantity with no
  variants, and a signed-out add returns to the product login target.
awaiting: user response

## Tests

### 1. Catalog, filters, and login-gated add
expected: Twelve products, server GET filters, slug detail, and login return target work in a browser.
result: [pending]

### 2. Cart and checkout failure/retry/success
expected: Stock errors stay inline; failed payment leaves the cart unchanged; successful checkout navigates to an owner confirmation.
result: [pending]

### 3. Owner isolation and admin lifecycle
expected: Non-owner order access is styled not-found; admin legal actions, refund/restock cancellation, and receipt links work.
result: [pending]

### 4. Dark-mode and narrow viewport backstops
expected: Key surfaces remain readable, keyboard reachable, and free of page-level overflow at 320px/375px in both themes.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
