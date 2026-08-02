# Phase 3: Ecommerce App - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-02
**Phase:** 3-Ecommerce App
**Areas discussed:** Catalog Shape, Cart Persistence, Checkout And Payment, Admin Order Lifecycle

---

## Catalog Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Northstar Coffee / 12 products / Drinks, Beans, Bakery / server GET filters | Focused coffee-shop catalog with dedicated product details and no variants | ✓ |
| Generic coffee shop | Leave identity and product mix generic | |
| Specialty roaster with variants | Add richer product options such as sizes or variants | |

**User's choice:** Accept all recommended decisions.
**Notes:** Product names, copy, imagery, price points, exact price-band boundaries, and component details remain agent discretion.

---

## Cart Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Authenticated database cart | Login on add; user-scoped `cart_items`; validate stock; snapshot price at checkout; clear only after success | ✓ |
| Cookie-backed guest cart | Allow anonymous carts and merge them after login | |
| Local-only guest cart | Use browser storage and defer persistence until login | |

**User's choice:** Accept all recommended decisions.
**Notes:** Failed checkout preserves the cart; over-stock quantities produce an inline error.

---

## Checkout And Payment

| Option | Description | Selected |
|--------|-------------|----------|
| Counter pickup / atomic mock payment | Signed-in customer identity; visible failure toggle; `withPool` locks stock and coordinates payment, order, items, and cart | ✓ |
| Shipping checkout | Add address and delivery fields | |
| External or random payment behavior | Hide the failure toggle or simulate nondeterministically | |

**User's choice:** Accept all recommended decisions.
**Notes:** Failed payment events persist without creating an order; unexpected transaction failures roll back. Confirmation is owner-scoped at `/orders/[id]`.

---

## Admin Order Lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Coffee pickup lifecycle | `paid → preparing → ready`, with `cancelled`; refund and restore stock for cancellable orders | ✓ |
| Generic shipping lifecycle | Use states such as processing/shipped | |
| No cancellation recovery | Keep stock deducted and payment unreversed after cancellation | |

**User's choice:** Accept all recommended decisions.
**Notes:** Receipts are post-commit mock emails linked by `order_id`; `/admin/orders` reuses the existing GET-filtered admin table pattern.

---

## the agent's Discretion

- Exact seed copy, images, product price points, price-band boundaries, SQL naming, component structure, and admin control composition within the accepted boundary.

## Deferred Ideas

None.
