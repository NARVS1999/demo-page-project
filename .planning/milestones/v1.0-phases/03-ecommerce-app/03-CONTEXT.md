# Phase 3: Ecommerce App - Context

**Gathered:** 2026-08-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the third flagship app as a coffee-shop storefront: a public product catalog with category and price filters, product detail pages, an authenticated persistent cart, a counter-pickup checkout using the existing mock payment service, atomic inventory deduction, owner-scoped order confirmation, mock receipt email visibility, and an admin order dashboard with status management. Real payments, shipping, tax, delivery, and product variants remain out of scope.

</domain>

<decisions>
## Implementation Decisions

### Catalog Shape
- The demo domain is Northstar Coffee, a neighborhood roaster with 12 realistic products.
- Products are grouped into three filterable categories: Drinks, Beans, and Bakery.
- Each product has a dedicated `/shop/[slug]` detail page with description, price, stock, and add-to-cart; no size or variant system is needed.
- Catalog filtering is server-rendered through GET parameters for category and simple price bands.

### Cart Persistence
- Browsing remains public, but adding an item requires login; the persistent cart is user-scoped in the `cart_items` table.
- Every quantity mutation is server-validated against positive integers and current inventory; quantities above stock return an inline error rather than being silently clamped.
- Cart rows use current product pricing; checkout snapshots the final integer-cent price into `order_items`.
- One checkout consumes the full cart. Successful checkout clears its purchased rows atomically; failed payment leaves the cart untouched.

### Checkout And Payment
- Orders are counter-pickup orders. The signed-in customer name and email are used; no shipping address or tax subsystem is added.
- Checkout exposes a visible `Simulate payment failure` checkbox, and the server validates the boolean again.
- A `withPool` transaction locks and decrements inventory, writes the mock payment through the transaction client, inserts the order and items, and clears the cart on success.
- A failed payment commits only its failed mock event and returns a failure state; it creates no order, does not deduct inventory, and does not clear the cart. Unexpected transaction errors roll back.
- Successful checkout redirects to owner-scoped `/orders/[id]`; unknown and non-owned IDs use the same not-found response.

### Admin Order Lifecycle
- Successful orders start at `paid` and progress through `preparing` to `ready`; `cancelled` is the terminal alternative.
- Admin may cancel `paid` or `preparing` orders. Cancellation refunds the mock payment and restores inventory in the same transaction; `ready` orders cannot be cancelled.
- Each successful order sends one post-commit mock receipt email linked by `order_id`; the existing admin email view is extended to show the link rather than adding a second inbox.
- The admin dashboard reuses the existing shell and table patterns, with GET status filtering, newest-first ordering, customer and totals columns, and per-row status actions.

### the agent's Discretion
- Exact product names, descriptions, imagery, and price points within the 10–15 product coffee-shop requirement.
- Exact SQL column names, indexes, route subcomponent structure, and shadcn primitives, provided the decisions above and repository conventions are preserved.
- Exact price-band boundaries and the visual arrangement of catalog filters.
- Exact admin action control composition and confirmation copy, while preserving the locked lifecycle and destructive-action confirmation patterns.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §Phase 3: Ecommerce App — phase goal, requirements, and success criteria.
- `.planning/REQUIREMENTS.md` §Ecommerce App — SHOP-01 through SHOP-07 acceptance requirements.
- `.planning/PROJECT.md` — zero-cost constraints, mock-service boundary, Postgres/Vercel stack, and no-real-payments decision.
- `AGENTS.md` — Next 16, raw SQL, dynamic DB pages, server-only boundaries, migrations, seed, and verification conventions.

### Established phase patterns
- `.planning/phases/02-booking-app/02-CONTEXT.md` — accepted transaction, mock-service, admin-shell, and seed conventions from the preceding flagship.
- `.planning/phases/02-booking-app/02-PATTERNS.md` — closest analogs for migrations, server actions, `withPool`, admin tables, forms, and seed upserts.
- `.planning/phases/02-booking-app/02-UI-SPEC.md` — inherited nature-newspaper design system, accessibility, responsive, state, and admin interaction rules.
- `db/migrations/003_booking.sql` — idempotent migration ordering, constraints, indexes, and existing domain-table conventions.
- `lib/db.ts` — `sql` reads and `withPool` transaction boundary.
- `lib/mock/payment.ts` — mock payment interface and transaction-client branch.
- `lib/mock/email.ts` — persisted mock receipt interface and existing email table integration.
- `scripts/seed.ts` — migration discovery, fixed IDs, idempotent upserts, and database-size reporting.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/db.ts`: Neon tagged SQL for reads plus `withPool` for atomic mutations.
- `lib/mock/payment.ts`: `createPayment`/`refund` supports an optional `PoolClient`, so payment rows can participate in order and cancellation transactions.
- `lib/mock/email.ts` and `app/admin/emails/page.tsx`: persisted mock-email outbox and the existing admin visibility surface to extend with `order_id`.
- `lib/validate.ts`, `lib/utils.ts`, and existing server actions: Zod 4 validation, UUID guards, generic anti-enumeration errors, `{ ok: true }` mutation returns, and revalidation.
- `components/layout/admin-shell.tsx`, `app/admin/layout.tsx`, and existing admin table/dialog components: authenticated admin shell and destructive-action interaction patterns.
- `app/(main)/layout.tsx` and existing catalog-like pages/components: public AppShell, force-dynamic page pattern, loading/error/empty states, cards, badges, and GET-filtered server rendering.

### Established Patterns
- All database-reading pages and route handlers export `dynamic = "force-dynamic"`.
- Raw SQL is parameterized through Neon templates outside transactions and `client.query` inside `withPool`; no ORM is introduced.
- Server actions re-check authentication, validate with Zod, return structured errors, revalidate affected paths, and let unexpected errors surface to the error boundary.
- Migrations are idempotent numbered SQL files automatically applied by `npm run seed`; demo data uses deterministic IDs and `ON CONFLICT` upserts.
- Client mutations use pending states, inline destructive errors, success toasts, and navigation or refresh after the server result.
- The inherited nature-newspaper system uses Newsreader/IBM Plex Mono, token-only Tailwind colors, hairline borders, square cards, responsive tables, and accessible 40px touch targets.

### Integration Points
- Add the next numbered migration for products, categories, cart items, orders, order items, and the mock-email order link.
- Extend `scripts/seed.ts` with Northstar Coffee categories/products and realistic deterministic demo orders/payment/receipt rows.
- Add public shop routes under the existing `(main)` AppShell and update the shared site navigation.
- Add authenticated cart and checkout server actions that use the existing session, validation, payment, email, and transaction helpers.
- Add `/admin/orders` under the existing AdminShell and extend the admin overview/email surfaces only where needed for order visibility.

</code_context>

<specifics>
## Specific Ideas

- The user accepted the recommended decisions for all four discussion areas without overrides.
- The coffee-shop experience should remain a focused portfolio demo: counter pickup, deterministic mock payment failure, realistic seeded products, and visible simulated receipt history.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Ecommerce App*
*Context gathered: 2026-08-02*
