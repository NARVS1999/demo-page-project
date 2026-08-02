---
phase: 03
slug: ecommerce-app
status: draft
shadcn_initialized: true
preset: nature newspaper — inherited Phase 0/1/2 contract with Northstar Coffee extension
created: 2026-08-02
---

# Phase 3 — UI Design Contract (Ecommerce App)

> This contract extends `.planning/phases/02-booking-app/02-UI-SPEC.md`.
> Phase 0 tokens, typography, accessibility, responsive breakpoints, loading /
> error conventions, and Phase 2 admin/table/dialog patterns remain in force
> unless this document explicitly adds a Northstar Coffee rule. No new npm
> dependency, shadcn registry component, color token, font, or radius is added.

## Design System

| Property | Value |
|----------|-------|
| Tool | Existing shadcn/ui + Tailwind v4 CSS-variable theming |
| Preset | Nature newspaper / retro Japan newsprint, inherited unchanged |
| Components | Existing Button, Card, Badge, Input, Label, Checkbox, Select, Alert, Dialog, AlertDialog, Skeleton, PageHeader, EmptyState, ErrorState, CoverImage, sonner |
| Icons | Existing lucide-react; use Coffee, ShoppingBag, Filter, Minus, Plus, Trash2, Receipt, Check, PackageCheck, RotateCcw as needed |
| Font | Newsreader for headings/body; IBM Plex Mono for prices, references, statuses, filters, and datelines |
| New packages | None |

Northstar is expressed through copy, product imagery, and a restrained coffee
shop vocabulary, not a new visual theme. Keep the inherited moss accent for
primary actions, links, focus rings, kickers, and selected states. Neutral
catalog surfaces use card/border/muted tokens; do not introduce coffee-brown
hex colors or hardcoded light/dark backgrounds.

## Product and Price Presentation

- Product cards are square, hairline-bordered newsprint cards with optional
  `CoverImage`, category kicker, serif product name, two-line description,
  mono price, stock state, and a clear `View product` action.
- Product prices are integer cents from the server and formatted at the edge by
  one client-safe shop helper. Do not display raw database numerics.
- Category labels are `Drinks`, `Beans`, and `Bakery`; the category filter uses
  `All products` plus those three labels.
- Price bands are `All prices`, `Under $5`, `$5–$15`, and `Over $15`. The exact
  boundaries are the plan's documented discretion choice and are applied in
  the server query, not only in the browser.
- Stock is visible on detail pages as `In stock`, `Only {N} left`, or `Sold out`.
  A sold-out product cannot submit an add-to-cart action.

## Copywriting Contract

| Surface | Copy |
|---------|------|
| Header nav | `Shop` → `/shop` · `Cart` → `/shop/cart` |
| Shop page | Kicker `Northstar Coffee` · H1 `Coffee for the next good thing` · description `Small-batch drinks, beans, and bakes for the daily ritual.` |
| Filter labels | `Category` and `Price`; clear link `Clear filters` |
| Product card CTA | `View product` |
| Product detail CTA | `Add to cart` |
| Login gate | Existing `Please sign in to continue.` alert and `/login?next=/shop/[slug]` return target |
| Empty catalog | `No products yet` / `Northstar Coffee has not added any products.` |
| Empty cart | `Your cart is empty` / `Add a drink, a bag of beans, or something warm from the bakery.` / `Browse the shop` |
| Cart page | Kicker `Northstar Coffee` · H1 `Your cart` · description `Review your items before pickup.` |
| Cart actions | `Update quantity`, `Remove`, `Continue shopping`, `Continue to checkout` |
| Stock error | `Only {N} left. Choose a smaller quantity.` |
| Checkout page | Kicker `Counter pickup` · H1 `Checkout` · description `Your order will be ready at Northstar Coffee.` |
| Failure checkbox | `Simulate payment failure` |
| Payment failure | `Payment failed. No order was created. Your cart is unchanged. Try again.` |
| Checkout submit | `Place order` |
| Order success | Kicker `Order confirmed` · H1 `Thanks for your order` · description `We saved your counter-pickup order.` |
| Receipt note | `Simulated receipt — no real email was sent.` |
| Order 404 | `Page not found` / `This order does not exist.` / `Back to the shop` |
| Admin page | H1 `Orders` · description `Northstar Coffee · newest first.` |
| Admin filters | `Status`: `All orders`, `Paid`, `Preparing`, `Ready`, `Cancelled`; clear link `Clear filters` |
| Admin actions | `Start preparing`, `Mark ready`, `Cancel order` |
| Admin cancel dialog | `Cancel order?` / `The payment will be refunded and inventory restored.` / `Cancel order` |
| Admin status errors | `This order is no longer available for that action.` |
| Admin email link | `Receipt for {orderRef}` → the admin order view for that order |

Tone remains short, plain, and action-oriented. No exclamation marks. Inline
errors explain the problem and next step; success toasts are reserved for
completed mutations (`Added to cart.`, `Cart updated.`, `Order placed.`,
`Order updated.`, `Order cancelled. Payment refunded.`).

## Route and Layout Contract

### Public catalog — `/shop`

- `force-dynamic` page under `(main)` with the Northstar kicker/header, GET
  filter bar, and a responsive product grid.
- Filter state is represented in the URL as `?category={slug}&price={band}`;
  invalid values normalize to the all-products state. The page query applies
  both filters server-side and preserves them in the clear link.
- Empty results use `EmptyState` with `Coffee`; loading renders card skeletons;
  errors use the shared `error-state` boundary with `Try again`.

### Product detail — `/shop/[slug]`

- `force-dynamic` server page resolves a product by slug and calls `notFound()`
  for unknown slugs.
- Layout is a two-column desktop detail: image/placeholder on the left and
  category, H1, description, mono price, inventory state, quantity input, and
  `Add to cart` form on the right; stack on mobile.
- The add form uses the server action, hidden product id/slug, a labeled
  positive-integer quantity input, pending disabled state, and an inline stock
  or auth error. It does not trust a browser price or inventory field.

### Persistent cart — `/shop/cart`

- Authenticated page under `(main)`; unauthenticated access redirects to
  `/login?next=/shop/cart`.
- A responsive table/card list shows image, product, current unit price,
  quantity control, line total, stock hint, inline error slot, and remove
  action. The summary shows subtotal only; no shipping, tax, or delivery rows.
- Quantity updates and removal are blocking server mutations with pending
  controls. A quantity above current inventory returns an inline error and
  leaves the row at its prior accepted value; it is never silently clamped.
- Empty cart uses the documented `EmptyState` and a `Browse the shop` CTA.

### Checkout — `/shop/checkout`

- Authenticated `force-dynamic` page; empty carts redirect to `/shop/cart`.
- The page shows signed-in customer name/email as identity context, a
  counter-pickup note, immutable server-loaded line-item snapshots for review,
  subtotal/total, the visible failure checkbox, and `Place order`.
- No shipping address, tax, delivery, variant, or payment-card fields appear.
- Failed payment returns an inline destructive Alert in the form, keeps the
  user on checkout, preserves every cart row, and leaves the checkbox retryable.
- Successful action returns `orderId`, shows one success toast, and navigates
  to the owner-scoped order confirmation.

### Owner confirmation — `/orders/[id]`

- Authenticated `force-dynamic` page with an ownership-scoped query. Unknown,
  malformed, and non-owned IDs use the same `notFound()` response.
- Shows order reference, status badge, created date, pickup note, item rows
  with quantity/unit price/line total snapshots, total, customer identity for
  the owner, and the simulated receipt note.
- Status badges are textual: paid/default, preparing/secondary,
  ready/outline, cancelled/outline muted. There is no customer cancellation
  button in this phase.

### Admin orders — `/admin/orders`

- `force-dynamic` page inside the existing AdminShell. The shell gains a Shop
  group containing an Orders link with `ShoppingBag` or `Receipt` icon.
- GET status filtering is shareable and server-rendered. Rows are newest-first
  and show order reference, customer name/email, total, placed date, status,
  and only the valid next action for that status.
- `paid` rows expose `Start preparing`; `preparing` rows expose `Mark ready`
  and `Cancel order`; `ready` rows expose no cancel action; `cancelled` rows
  expose no mutation action.
- Status transitions use a non-destructive dialog where confirmation matters;
  cancellation uses `AlertDialog` and the existing `requestSubmit()` intercept
  so Radix cannot unmount the form before the action runs.
- Cancellation success shows one toast with refund language and refreshes the
  row. The table remains responsive with `overflow-x-auto`, `min-w-[720px]`,
  truncated customer email with a `title`, and no page-level horizontal scroll.

### Admin email outbox — `/admin/emails`

Add an order/receipt column only for rows with `order_id`; existing booking
rows retain their current rendering. The order reference is a visible link to
the admin order view query for that id, so the existing outbox remains the
single place to inspect simulated receipts.

## Interaction and State Patterns

1. **Catalog filters:** native/controlled GET form, no client fetch; change
   submits a URL and the server renders the filtered result.
2. **Add to cart:** guest → login return target; authenticated success → one
   `Added to cart.` toast and cart/header refresh; stock/auth/action errors are
   inline in the product detail form.
3. **Cart mutations:** no optimistic state; pending buttons disable; success
   refreshes data; over-stock returns an inline field/row error.
4. **Checkout state machine:** ready → submitting → success (toast + order
   navigation) or payment-failed (inline Alert, cart unchanged, retryable).
5. **Admin lifecycle:** only legal next actions render; action failure stays in
   the dialog; success uses one toast + `router.refresh()`.
6. **Destructive cancellation:** all cancel buttons use `AlertDialog`; the
   destructive action is pending-disabled and explains refund/restock effects.
7. **Mock honesty:** the checkout and order confirmation visibly call out that
   payment and receipt behavior is simulated; no real provider language implies
   a charge or email was sent.

## Responsive Behavior

- Product grid: one column on mobile, two at `md`, three at `lg`; cards retain
  `p-6` and square borders.
- Detail: image and purchase panel stack below `md`; quantity and CTA remain
  at least 40px tall and full-width on narrow screens.
- Cart and admin tables use `overflow-x-auto` and a minimum width; cards do not
  force the page to scroll horizontally.
- Cart summary and checkout submit become a full-width sticky bottom bar on
  mobile using `bg-background/95`, `backdrop-blur`, and a hairline top border;
  they are inline/right-aligned on `md` and above.
- Filter controls wrap with `flex-wrap`; each control is full-width on mobile
  and auto-width from `sm` upward.

## Accessibility

- One H1 per route; H2 sections for cart summary/order items/admin table groups.
- Every quantity input and filter has a visible `Label`, `htmlFor`, and an
  `aria-describedby` path for inline errors; invalid controls expose
  `aria-invalid`.
- Product cards have meaningful image alt text or an aria-hidden placeholder;
  decorative icons are hidden from assistive technology.
- Buttons name their action (`Add to cart`, `Update quantity`, `Remove`,
  `Cancel order`); icon-only quantity/remove controls are at least 40×40px
  and carry an `aria-label`.
- Radix Dialog/AlertDialog supplies focus trapping, ESC dismissal, and modal
  semantics; destructive cancellation keeps the explicit body copy.
- Status badges include their full words and never communicate state through
  color alone. Payment failure and stock errors use `role="alert"`.
- Custom transitions include `motion-reduce:transition-none`; token colors
  retain the Phase 0 contrast contract in both themes.

## Visual Quality Bar

1. Product cards feel like a coherent Northstar catalog while retaining the
   nature-newspaper vocabulary: serif names, mono prices, moss kickers, and
   hairline dividers.
2. Every data route has a matching skeleton, empty state where applicable, and
   retryable error boundary; no blank flashes or dead buttons.
3. Cart, checkout, and admin mutation states visibly distinguish idle,
   pending, success, stock error, payment failure, and stale-action error.
4. The order total always equals the sum of displayed snapshot line totals;
   the UI never recomputes from a browser-controlled price.
5. Dark mode uses semantic tokens only; no hardcoded coffee-brown, white, or
   black colors appear in the new surfaces.
6. Seeded 12-product content and order receipts read as realistic coffee-shop
   data, never lorem ipsum.

## UI Considerations

Applicable state considerations resolved: 12 covered, 2 backstops, 0
unresolved.

| Category | Elements | Status | Resolution |
|----------|----------|--------|------------|
| empty | catalog, filtered catalog, cart, admin orders | covered | Each uses a route-appropriate EmptyState and recovery CTA where one exists. |
| loading | catalog, detail, cart, checkout, order, admin | covered | Sibling loading files mirror the final grid/table/card shapes. |
| error | route boundaries, stock, payment failure, stale admin action | covered | Error boundary or inline destructive Alert always includes recovery copy. |
| zero-one-many | products, cart lines, order items, admin rows | covered | Zero uses empty state; one and many use the same layout with pluralized copy. |
| overflow | product names, customer email, order table, receipt body | covered | `line-clamp`/`truncate` plus title attributes and responsive table wrappers. |
| session-gated | add, cart, checkout, order detail, admin actions | covered | Server actions and owner/admin queries enforce the same boundaries as UI. |
| keyboard | filters, quantity fields, dialogs, table actions | covered | Native form controls and Radix primitives remain keyboard reachable. |
| payment-state | checkout success/failure | covered | Failure keeps cart and page state; success navigates only after committed order. |
| inventory-state | out-of-stock, low stock, over-quantity | covered | Server stock truth drives copy and disabled states; no silent clamp. |
| lifecycle-state | paid/preparing/ready/cancelled | covered | Badge text and legal action set are explicit per status. |
| dark-mode | catalog, cart, checkout, admin tables/dialogs | backstop | Visual contrast audit in both themes at phase verification. |
| small-screen | grids, cart summary, checkout CTA, admin table | backstop | Held-out 320px/375px check for no page-level horizontal overflow. |

## Registry Safety and Sign-Off

No new registry blocks or package installs are declared. All UI is composed
from existing in-repo primitives and custom components authored under
`components/shop` / `components/admin`.

- [x] Inherited design tokens and component inventory reviewed
- [x] Locked checkout, cart, catalog, order, and admin decisions represented
- [x] No new dependency or registry block required
- [ ] Visual checker sign-off (execute-phase backstop)

**Approval:** planning contract ready; visual sign-off remains an execution
verification step.
