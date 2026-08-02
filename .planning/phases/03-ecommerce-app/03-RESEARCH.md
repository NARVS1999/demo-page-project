---
phase: 03-ecommerce-app
researched: 2026-08-02
domain: ecommerce storefront, persistent cart, transactional checkout, order lifecycle
confidence: HIGH (in-repo patterns and locked phase context)
---

# Phase 3: Ecommerce App — Research

## Research Decision

This phase uses Level 0 in-repo discovery rather than introducing an external
integration or a new library. The transaction vehicle, mock payment failure
switch, mock email outbox, auth/session contract, migration runner, seed
conventions, admin shell, and nature-newspaper UI contract already exist and
were verified in the Phase 2 pattern map and source files. No package install
is required for this phase; the package-legitimacy gate is therefore not
applicable.

The implementation plan still records the checkout and cancellation invariants
explicitly because they are state-transition requirements, not optional
implementation details.

## Summary

Phase 3 is an additive Northstar Coffee domain on the existing Next.js 16 +
Neon Postgres template. The backend plan adds an idempotent `004_ecommerce.sql`
migration, user-scoped cart rows, integer-cent order snapshots, transaction-safe
inventory/payment/order writes, mock receipt linkage, order lifecycle actions,
and deterministic Northstar seed data. The UI plan adds public catalog/detail
routes, authenticated cart and checkout surfaces, owner-scoped order
confirmation, and the admin order queue.

All external behavior remains mocked. `payment.createPayment` already accepts
`fail: true` and an optional `PoolClient`; checkout must use both so a failed
payment event commits without creating an order, while a successful payment,
inventory decrement, order, order items, and cart clear commit together.

## Locked Constraints Carried Into Planning

The CONTEXT.md decision bullets are given traceability labels in the plans:

| Label | Locked constraint | Planning consequence |
|-------|-------------------|----------------------|
| D-01 | Northstar Coffee with 12 realistic products in Drinks, Beans, and Bakery | Seed exactly 12 products and three shop categories; no generic placeholder catalog. |
| D-02 | Dedicated `/shop/[slug]` pages, no variants, server GET category/price filters | Product reads use slug routes and allowlisted search params; no size/variant table. |
| D-03 | Public browsing; login required to add; user-scoped persistent `cart_items` | All cart actions re-check `getCurrentUser`; every cart query scopes by `user_id`. |
| D-04 | Positive-integer quantity validation against current inventory; over-stock is an inline error | Zod validates the form value and the server checks current stock; never silently clamps. |
| D-05 | Cart uses current product price; checkout snapshots integer cents into `order_items` | Cart reads join current products; order items store `unit_price_cents` and line totals. |
| D-06 | One checkout consumes the full cart; success clears purchased rows atomically; failure leaves cart untouched | Checkout is one `withPool` transaction; failed payment has a no-order branch that preserves cart rows. |
| D-07 | Counter pickup; signed-in customer identity; no shipping, tax, or delivery subsystem | Checkout has no address/tax fields and uses the session name/email. |
| D-08 | Visible payment-failure checkbox; server validates the boolean again | `checkoutSchema` normalizes checked/unchecked FormData and action ignores client-only assumptions. |
| D-09 | `withPool` locks/decrements stock, writes mock payment, inserts order/items, clears cart | All multi-write SQL uses `client.query(text, params)` within one transaction. |
| D-10 | Failed payment commits only its failed mock event; no order, stock decrement, or cart clear; unexpected errors roll back | `fail: true` is handled as a committed failure result, not a thrown rollback; other errors throw. |
| D-11 | Successful checkout redirects to owner-scoped `/orders/[id]`; unknown/non-owned IDs share not-found behavior | Order detail query includes `WHERE order.user_id = currentUser.id` and calls `notFound()` for no row. |
| D-12 | `paid → preparing → ready`, `cancelled` terminal; cancel only paid/preparing refunds and restores inventory | Admin action allowlists transitions and performs refund/restock in the cancel transaction. |
| D-13 | One post-commit mock receipt email linked by `order_id`; extend existing email view | `sendEmail({ orderId })` writes the nullable link after commit; `/admin/emails` displays the order link. |
| D-14 | Admin orders uses existing shell/table patterns, GET status filters, newest-first, customer/totals, row actions | `/admin/orders` is force-dynamic, GET-filtered, newest-first, and uses per-row dialogs/actions. |

## Verified Existing Patterns

### Database and transaction boundary

- `lib/db.ts` exports `sql` for one-shot HTTP reads and `withPool` for
  `BEGIN`/`COMMIT`/`ROLLBACK` transactions.
- The Phase 2 booking actions establish the required discipline: inside
  `withPool`, use only `client.query` with `$1` parameters; do not use the
  module-level tagged `sql` function in the transaction.
- `004_ecommerce.sql` must be discovered automatically by `scripts/seed.ts`,
  use `IF NOT EXISTS` for additive DDL, use the drop/add pair for a status
  check constraint, and terminate statements with `;` plus a newline.
- Stock correctness needs row locks on the cart's product rows before checking
  quantities and decrementing inventory. The action should also retain a
  conditional inventory guard so a stale quantity cannot produce a negative
  inventory value.

### Mock services

- `lib/mock/payment.ts` already persists both `succeeded` and `failed` events,
  accepts `fail: boolean`, and can write through a supplied `PoolClient`.
- `lib/mock/email.ts` is the single writer for `mock_emails`; its optional
  `bookingId` extension proves the backwards-compatible shape for adding an
  optional `orderId` without forking SQL at the call site.
- The order receipt is post-commit, matching the booking notification pattern:
  the order is the atomic unit, while the mock email is an inspectable log row.

### Server actions and validation

- Existing actions start with `"use server"`, call `getCurrentUser()` again,
  validate FormData with Zod, return structured `{ ok, message, errors }`
  values, revalidate affected paths, and let unexpected errors reach the
  error boundary.
- `isUuid` must guard every cart/order/product id before SQL. Generic stale or
  unauthorized messages preserve the template's anti-enumeration behavior.
- Checkbox FormData uses `"on"` when checked and is absent when unchecked;
  `z.preprocess` is the established normalization pattern.

### UI and route conventions

- Every DB-reading page exports `dynamic = "force-dynamic"`.
- Public pages live under `(main)` and inherit `AppShell`; admin pages live
  below `app/admin` and inherit `AdminShell` plus its auth guard.
- Phase 2's UI-SPEC is the closest extension contract: nature-newspaper tokens,
  Newsreader/IBM Plex Mono roles, hairline borders, square cards, token-only
  colors, 40px targets, blocking mutations, inline errors, success toasts,
  Radix dialog/alert-dialog confirmation, and route loading/error/empty states.
- GET filters are server-rendered forms with allowlisted values; mutation
  components use `useActionState`, disabled pending controls, and
  `router.refresh()` after success.

## Recommended Schema Shape

Use a domain-specific `shop_categories` table rather than mixing Northstar
categories into the existing CMS `categories` taxonomy. The migration should
create:

- `shop_categories`: UUID, unique slug, name, timestamps.
- `products`: UUID, unique slug, category FK, name, description, nullable
  image URL, integer `price_cents`, non-negative integer `inventory`,
  timestamps.
- `cart_items`: composite primary key `(user_id, product_id)`, positive
  integer quantity, timestamps, user/product foreign keys.
- `orders`: UUID, owner FK, payment FK, integer `total_cents`, status check for
  `paid`, `preparing`, `ready`, `cancelled`, timestamps.
- `order_items`: UUID, order/product FKs, product-name snapshot, positive
  quantity, integer `unit_price_cents`, integer `line_total_cents`.
- `mock_emails.order_id`: nullable FK to orders plus a partial index, leaving
  all existing booking-linked email rows valid.

`shop_categories` is an implementation choice within the CONTEXT discretion
and avoids changing CMS category management behavior. The plans still expose
the required catalog category data and name the category table explicitly.

## Transaction Sequences

### Cart mutation

1. Authenticate and validate UUID/product id plus a positive integer quantity.
2. Read the product's current inventory.
3. Reject a quantity above inventory with an inline state; do not clamp it.
4. Upsert the user/product row or update/delete it through parameterized SQL.
5. Revalidate `/shop/cart` and `/shop` as appropriate.

### Checkout success/failure

1. Authenticate and normalize the failure checkbox on the server.
2. In `withPool`, select the full cart joined to products and lock product rows.
3. Reject an empty cart or any over-stock row before writing an order.
4. Compute the total from current integer-cent prices and call
   `payment.createPayment({ amount: totalCents, currency: "usd", fail }, client)`.
5. If payment status is `failed`, return a failure result from the callback so
   the transaction commits only the failed mock event; do not update stock,
   orders, order items, or cart rows.
6. If payment succeeds, decrement every product, insert the order at `paid`,
   insert all price/name snapshots, and delete the user's purchased cart rows.
7. After commit, call `email.sendEmail({ ..., orderId })` exactly once and
   return `{ ok: true, orderId }` for the redirect.

### Admin lifecycle

- `paid → preparing` and `preparing → ready` use allowlisted status updates.
- `paid|preparing → cancelled` runs in `withPool`: update the order, restore
  every order-item quantity, and call `payment.refund(paymentId, client)`.
- `ready` and `cancelled` cannot be cancelled; stale/replayed actions return a
  generic order-state message and do not mutate stock or payment.

## Seed and Idempotency

- Use deterministic IDs with prefixes not used by Phase 0–2 seed records.
- Upsert the three categories and all 12 products by stable slug/id, updating
  realistic names, descriptions, prices, and inventory without duplicating
  rows.
- Seed at least two realistic orders with mixed lifecycle states, matching
  order items, payment rows, and order-linked receipt emails. Insert payment
  rows before orders when a foreign key requires it.
- Add `shop_categories`, `products`, `cart_items`, `orders`, and `order_items`
  to the size report. Re-running `npm run seed` twice must preserve row counts
  and remain below the existing 200 MB gate.

## Architectural Responsibility Map

| Capability | Primary tier | Secondary tier | Reason |
|------------|--------------|----------------|--------|
| Catalog/filter/detail reads | RSC + Neon read | client filter form | GET params are server-rendered and force-dynamic. |
| Cart CRUD | server action | Postgres constraints | Session ownership and stock are server truth. |
| Checkout/payment | server action | Postgres transaction + mock payment | One transaction coordinates stock, payment, order, items, and cart. |
| Inventory protection | Postgres | server action | Row locks and guarded updates prevent negative stock/overselling. |
| Order detail | RSC + ownership SQL | client confirmation display | Non-owned/unknown ids share `notFound()`. |
| Admin lifecycle | server action | admin shell/table | Allowlisted transitions, refund, and restock stay server-side. |
| Receipt visibility | mock email service | admin email page | Existing outbox remains the single inbox. |

## Common Pitfalls to Prevent

1. Clearing the cart before payment/order commit — delete only in the success
   branch after the order items exist.
2. Rolling back a failed payment event — return a failure result from the
   transaction callback so the failed mock row is intentionally committed.
3. Trusting cart prices or quantities from the browser — re-read products and
   current prices under the transaction lock.
4. Letting an order action mutate another owner's order — use ownership SQL for
   `/orders/[id]`; admin actions are separate and remain behind the admin shell.
5. Refunding without restocking, or restocking a ready order — guard lifecycle
   transitions and perform both effects in the same cancellation transaction.
6. Reusing the CMS `categories` table — use `shop_categories` so catalog and
   blog taxonomies stay isolated.
7. Forgetting `force-dynamic` on any catalog/cart/checkout/order/admin DB page.
8. Adding a real payment/email SDK or a new UI registry package — no new
   dependencies are required for the locked mock flow.

## Package Legitimacy Audit

No package-manager install tasks are planned. The phase uses the pinned
`@neondatabase/serverless`, `zod`, `radix-ui`, `lucide-react`, `sonner`, and
existing shadcn wrappers only; no new registry or package legitimacy review is
required.
