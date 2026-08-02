# Roadmap: Free Fullstack Showcase

## Overview

Build 10–30 fully deployed fullstack demo apps at $0/month. The foundation is a reusable `nextjs-starter` template with auth, database, mock services, and UI components. Three flagship apps (CMS, Booking, Ecommerce) validate the template and demonstrate range. A portfolio shell aggregates everything. Batch projects scale the pattern to 25+ apps. Every project gets its own GitHub repo and Vercel deployment with a shared $0 budget.

## Phases

- [x] **Phase 0: Template Foundation** - Reusable nextjs-starter with auth, DB, mocks, seed script, and deployment infra (completed 2026-08-02)
- [x] **Phase 1: CMS App** - Blog/content management with post CRUD, markdown editor, categories, admin dashboard (completed 2026-08-02)
- [x] **Phase 2: Booking App** - Service scheduling with slot calendar, booking flow, double-booking prevention, mock email/SMS (completed 2026-08-02)
- [ ] **Phase 3: Ecommerce App** - Online shop with catalog, cart, checkout, mock payment, order management
- [ ] **Phase 4: Portfolio Shell** - Project showcase grid with live links, tech badges, demo credentials

## Phase Details

### Phase 0: Template Foundation

**Goal**: A battle-tested reusable template that every project inherits from — auth, database, mock services, seed script, and UI components, all designed to prevent the 10 critical pitfalls identified in research.
**Depends on**: Nothing (first phase)
**Requirements**: TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05, TMPL-06, TMPL-07, TMPL-08, TMPL-09, TMPL-10, DEPL-01, DEPL-02, DEPL-03, DEPL-04, DEPL-05
**Success Criteria** (what must be TRUE):

  1. User can register, log in, and log out with session persisted in Postgres via jose JWT
  2. `npm run seed` populates a Neon Postgres database with demo data and reports storage usage under 200 MB
  3. All 6 mock services (payment, email, SMS, OAuth, maps, storage) are importable and match real service API shapes
  4. Environment variables are validated on startup via Zod — missing vars produce clear errors, not cryptic crashes
  5. Template has `.env.example`, dark/light theme toggle, loading/error states, and a sample CRUD page as reference implementation

**Plans**: 2/2 plans executed

Plans:

- [x] 00-01-PLAN.md
- [x] 00-02-PLAN.md
- [x] 00-01: Project scaffolding — Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui + Neon driver + Zod validation
- [x] 00-02: Core infrastructure — auth system (login/register/logout), DB pool, mock services layer, seed script, env validation, dark/light theme

### Phase 1: CMS App

**Goal**: First flagship project that validates the template with a real domain. A working blog/CMS with post CRUD, markdown editor, categories/tags, admin dashboard, and public-facing pages — the most recognizable fullstack pattern every hiring manager understands.
**Depends on**: Phase 0
**Requirements**: CMS-01, CMS-02, CMS-03, CMS-04, CMS-05, CMS-06, CMS-07, CMS-08
**Success Criteria** (what must be TRUE):

  1. User can create, edit, and delete posts with a markdown editor and live preview
  2. Posts have draft/publish workflow — only published posts appear on the public blog
  3. User can filter posts by category and tag, and search posts by title/content via ILIKE
  4. Admin dashboard shows all posts with edit/delete actions and category/tag management
  5. Demo data includes 3-5 realistic blog posts (not Lorem ipsum) with a "Demo Guide" in the README

**Plans**: 2 plans

Plans:

- [x] 01-01: Schema + API routes — posts, categories, tags tables; CRUD route handlers; search endpoint
- [x] 01-02: UI pages — public blog list, single post, category/tag filters, admin dashboard, markdown editor

### Phase 2: Booking App

**Goal**: Second flagship that tests mock services (email + SMS confirmations) and introduces transaction complexity. A service scheduling app where users book time slots and admins manage bookings — proving the template handles atomic operations.
**Depends on**: Phase 0
**Requirements**: BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06, BOOK-07, BOOK-08
**Success Criteria** (what must be TRUE):

  1. User can browse available services and see open time slots on a calendar-style display
  2. User can book a slot — double-booking prevention ensures two users cannot book the same slot (atomic transaction)
  3. Admin can confirm or cancel bookings, and view mock email/SMS confirmations saved to the database
  4. Booking flow sends mock email confirmation and mock SMS reminder (logged to DB tables, viewable in admin)
  5. Demo data includes a yoga studio with 3 services, realistic slot schedules, and sample bookings

**Plans**: 2/2 plans executed

Plans:

- [x] 02-01-PLAN.md
- [x] 02-02-PLAN.md

- [x] 02-01: Schema + API routes — services, slots, bookings tables; atomic booking with BEGIN/COMMIT transaction
- [x] 02-02: UI pages — service listing, slot calendar, booking confirmation, admin management, mock email/SMS views

### Phase 3: Ecommerce App

**Goal**: Third flagship with the most complex mock integration. A coffee shop storefront with product catalog, shopping cart, checkout flow with mock payment, and admin order management — demonstrating state management and payment simulation.
**Depends on**: Phase 0
**Requirements**: SHOP-01, SHOP-02, SHOP-03, SHOP-04, SHOP-05, SHOP-06, SHOP-07
**Success Criteria** (what must be TRUE):

  1. User can browse products with category/price filtering and add items to a persistent shopping cart
  2. Checkout flow processes mock payment with success/fail toggle and creates an order with confirmation page
  3. Inventory is deducted atomically when an order is placed — no overselling
  4. Admin orders dashboard shows all orders with status management and mock receipt email viewing
  5. Demo data includes a coffee shop with 10-15 products, categories, and realistic seed data

**Plans**: 2 plans

Plans:

- [ ] 03-01: Schema + API routes — products, categories, cart_items, orders, order_items tables; cart CRUD; checkout with mock payment
- [ ] 03-02: UI pages — product catalog, product detail, cart, checkout, order confirmation, admin orders dashboard

### Phase 4: Portfolio Shell

**Goal**: The front door to the entire showcase — a responsive project grid that aggregates all deployed apps with live links, GitHub links, tech badges, and demo credentials. First thing hiring managers see.
**Depends on**: Phase 1, Phase 2, Phase 3
**Requirements**: PORT-01, PORT-02, PORT-03, PORT-04
**Success Criteria** (what must be TRUE):

  1. Portfolio displays a responsive grid of all projects with live demo links and GitHub repo links
  2. Each project card shows tech stack badges, demo credentials, and a "Uses simulated X" note for mock services
  3. All project links resolve to working deployments — no 404s
  4. README documents the full portfolio, Vercel invocation budget, and maintenance checklist

**Plans**: 1 plan

Plans:

- [ ] 04-01: Project grid, metadata registry, responsive layout, project cards with links/badges/credentials

## Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| TMPL-01 | Phase 0 | Pending |
| TMPL-02 | Phase 0 | Pending |
| TMPL-03 | Phase 0 | Pending |
| TMPL-04 | Phase 0 | Pending |
| TMPL-05 | Phase 0 | Pending |
| TMPL-06 | Phase 0 | Pending |
| TMPL-07 | Phase 0 | Pending |
| TMPL-08 | Phase 0 | Pending |
| TMPL-09 | Phase 0 | Pending |
| TMPL-10 | Phase 0 | Pending |
| DEPL-01 | Phase 0 | Pending |
| DEPL-02 | Phase 0 | Pending |
| DEPL-03 | Phase 0 | Pending |
| DEPL-04 | Phase 0 | Pending |
| DEPL-05 | Phase 0 | Pending |
| CMS-01 | Phase 1 | Pending |
| CMS-02 | Phase 1 | Pending |
| CMS-03 | Phase 1 | Pending |
| CMS-04 | Phase 1 | Pending |
| CMS-05 | Phase 1 | Pending |
| CMS-06 | Phase 1 | Pending |
| CMS-07 | Phase 1 | Pending |
| CMS-08 | Phase 1 | Pending |
| BOOK-01 | Phase 2 | Pending |
| BOOK-02 | Phase 2 | Pending |
| BOOK-03 | Phase 2 | Pending |
| BOOK-04 | Phase 2 | Pending |
| BOOK-05 | Phase 2 | Pending |
| BOOK-06 | Phase 2 | Pending |
| BOOK-07 | Phase 2 | Pending |
| BOOK-08 | Phase 2 | Pending |
| SHOP-01 | Phase 3 | Pending |
| SHOP-02 | Phase 3 | Pending |
| SHOP-03 | Phase 3 | Pending |
| SHOP-04 | Phase 3 | Pending |
| SHOP-05 | Phase 3 | Pending |
| SHOP-06 | Phase 3 | Pending |
| SHOP-07 | Phase 3 | Pending |
| PORT-01 | Phase 4 | Pending |
| PORT-02 | Phase 4 | Pending |
| PORT-03 | Phase 4 | Pending |
| PORT-04 | Phase 4 | Pending |

**Coverage:** 41/41 v1 requirements mapped ✓

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Template Foundation | 2/2 | Complete    | 2026-08-02 |
| 1. CMS App | 2/2 | Complete    | 2026-08-02 |
| 2. Booking App | 2/2 | Complete    | 2026-08-02 |
| 3. Ecommerce App | 0/2 | Not started | - |
| 4. Portfolio Shell | 0/1 | Not started | - |
