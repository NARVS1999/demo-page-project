---
phase: 03-ecommerce-app
mapped: 2026-08-02
source: existing Phase 0–2 implementation and planning artifacts
---

# Phase 3: Ecommerce App — Pattern Map

This phase is additive. The closest analog is the Phase 2 booking app; use its
transaction, server-action, seed, admin-table, and UI state patterns rather
than introducing a new architectural style.

## File and Pattern Assignments

| Planned surface | Closest analog | Required pattern |
|-----------------|----------------|------------------|
| `db/migrations/004_ecommerce.sql` | `db/migrations/003_booking.sql` | Idempotent DDL, dependency-first table order, drop/add status CHECK, partial indexes, statement termination for the seed runner. |
| `lib/shop.ts` | `lib/booking.ts`, `lib/blog.ts` | Client-safe pure helpers and exported serializable data shapes; no `server-only`. |
| `lib/validate.ts` additions | `bookingSchema` and `postSchema` | Zod 4 schemas, `z.preprocess` for checkboxes/numeric FormData, inferred input types. |
| `lib/mock/email.ts` | existing `bookingId` extension | Optional `orderId` parameter, nullable DB column, preserve old call sites. |
| `app/(main)/shop/actions.ts` | `app/(main)/book/actions.ts` | `"use server"`, `getCurrentUser`, `isUuid`, `withPool`, structured FormState, revalidation, and no tagged `sql` in transactions. |
| checkout transaction | `createBooking` | Lock/read current rows → mock payment via PoolClient → success writes → commit → post-commit notice; explicit committed failure branch. |
| admin order actions | `app/admin/bookings/actions.ts` | Auth re-check, UUID guard, allowlisted status transition, transaction for cancel/refund/restock, generic stale response. |
| `scripts/seed.ts` | Phase 2 `SERVICES`/`SAMPLE_BOOKINGS` blocks | New deterministic prefix families, upserts, FK-order payment rows, realistic fixed records, size-report table list. |
| `/shop` catalog | `app/(main)/blog/page.tsx` and `blog/search/page.tsx` | `force-dynamic`, allowlisted GET params, one server query, typed props, empty state, loading/error siblings. |
| `/shop/[slug]` detail | `app/(main)/blog/[slug]/page.tsx` | Slug lookup, `notFound()` for stale slug, `force-dynamic`, server-rendered detail plus client mutation form. |
| cart and checkout pages | Phase 2 booking flow/dialog | Client state only for form/pending behavior, server action as truth, inline errors, success toast/navigation, no optimistic stock/cart updates. |
| `/orders/[id]` | `app/(main)/booking/[id]/page.tsx` | Authenticated ownership-scoped query; unknown/non-owned result maps to the same not-found response; route loading/error/not-found. |
| `/admin/orders` | `app/admin/bookings/page.tsx` and `components/admin/bookings-table.tsx` | GET status filters, newest-first SQL order, responsive table, per-row dialogs, `requestSubmit()` intercept for destructive actions. |
| `/admin/emails` order link | existing read-only email table | Additive `order_id` select and link column; keep booking rows and existing outbox behavior unchanged. |
| shell/nav | `lib/site.ts`, `components/layout/admin-shell.tsx` | Single nav source, existing AppShell/AdminShell, no template version bump. |

## Contracts Downstream UI Uses

- `CartItemRow`: `{ productId, slug, name, imageUrl, unitPriceCents, quantity, inventory, lineTotalCents }`.
- `CatalogProduct`: `{ id, slug, categorySlug, categoryName, name, description, imageUrl, priceCents, inventory }`.
- `OrderSummary`: `{ id, status, totalCents, paymentStatus, createdAt, items[] }` with owner-only customer identity.
- `FormState`: `{ ok?: boolean; message?: string; errors?: Record<string, string[] | undefined>; orderId?: string }`.
- `checkoutSchema` fields: `simulateFailure` (checkbox normalized to boolean).
- Cart mutation fields: `productId`, `quantity` (positive integer string from FormData).
- Order status action fields: `orderId`, `status` (allowlisted lifecycle enum).

## Interface and SQL Rules

1. Prices remain integer cents at every new table and UI boundary. Format only
   at the display edge through one client-safe helper.
2. Catalog filters are allowlisted values converted into SQL fragments only
   after validation; values remain parameterized. No string-concatenated user
   input enters SQL.
3. The checkout transaction locks product rows before using their price and
   inventory. It inserts `order_items` from those locked values, never from
   hidden browser fields.
4. Mock payment is the only writer of `mock_payments`; mock email is the only
   writer of `mock_emails`. The order actions pass the PoolClient to payment
   for refund/cancellation and call email only after commit.
5. Every page that reads Neon declares `export const dynamic = "force-dynamic"`.
6. `lib/db.ts`, `lib/session.ts`, and `lib/mock/*` remain server-only; any
   component imported by a client component uses serializable props only.

## File Ownership and Waves

- Plan `03-01` owns migration, validation/helpers, mock email extension, cart
  and checkout actions, admin order actions, seed, and backend tests.
- Plan `03-02` depends on `03-01` and owns all storefront/order/admin UI,
  navigation, route loading/error/not-found files, and the admin email display
  extension only when its UI link is needed. It does not alter transaction SQL.
- No same-wave plan overlap exists: the backend plan is Wave 1; the UI plan is
  Wave 2 because it consumes the action and data contracts from Wave 1.
