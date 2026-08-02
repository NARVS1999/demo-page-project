# Requirements: Free Fullstack Showcase

**Defined:** 2026-08-01
**Core Value:** Every project deploys and works end-to-end at zero cost — if it costs money, it doesn't ship.

## v1 Requirements

### Template Foundation

- [x] **TMPL-01**: `nextjs-starter` template with App Router, TypeScript, Tailwind v4
- [x] **TMPL-02**: Auth system — login/register/logout with credentials, session in Postgres via jose JWT
- [x] **TMPL-03**: Database pool — `@neondatabase/serverless` with neon() for queries, Pool for transactions
- [x] **TMPL-04**: Mock services layer — `lib/mock/*` with interfaces matching real APIs (payment, email, SMS, OAuth, maps, storage)
- [x] **TMPL-05**: Seed script — `npm run seed` populates demo data
- [x] **TMPL-06**: Dark/light theme toggle
- [x] **TMPL-07**: Loading/error states for all pages
- [x] **TMPL-08**: Sample CRUD page (users or posts) as reference implementation
- [x] **TMPL-09**: Input validation via Zod in `lib/validate.ts`
- [x] **TMPL-10**: Environment variable validation on startup

### CMS App

- [x] **CMS-01**: Admin CRUD for posts with markdown editor
- [x] **CMS-02**: Draft/publish workflow
- [x] **CMS-03**: Category and tag management
- [x] **CMS-04**: Image upload via mock storage
- [x] **CMS-05**: Search posts via ILIKE
- [x] **CMS-06**: Public blog list page
- [x] **CMS-07**: Public single post page
- [x] **CMS-08**: Public category/tag filter pages

### Booking App

- [x] **BOOK-01**: Service listing page
- [x] **BOOK-02**: Slot calendar showing available/taken slots
- [x] **BOOK-03**: Booking flow — user selects slot and confirms
- [x] **BOOK-04**: Double-booking prevention (atomic slot reservation)
- [x] **BOOK-05**: Admin confirm/cancel bookings
- [x] **BOOK-06**: Mock email confirmation (saved to DB, viewable in admin)
- [x] **BOOK-07**: Mock SMS reminder (logged to table)
- [x] **BOOK-08**: Optional mock payment deposit

### Ecommerce App

- [ ] **SHOP-01**: Product catalog with category/price filters
- [x] **SHOP-02**: Shopping cart (persistent across sessions)
- [x] **SHOP-03**: Checkout flow with mock payment (success/fail toggle)
- [ ] **SHOP-04**: Order confirmation page
- [x] **SHOP-05**: Admin orders dashboard
- [x] **SHOP-06**: Inventory deduction on order
- [x] **SHOP-07**: Mock receipt email

### Portfolio Shell

- [ ] **PORT-01**: Grid of all projects with live link, GitHub link, tech badges
- [ ] **PORT-02**: Demo credentials display per project
- [ ] **PORT-03**: "Uses simulated X" note per card
- [ ] **PORT-04**: Responsive design

### Deployment & DevOps

- [x] **DEPL-01**: Each project has own GitHub repo
- [x] **DEPL-02**: Each project auto-deploys to Vercel on git push
- [x] **DEPL-03**: Neon database per project (0.5 GB each)
- [x] **DEPL-04**: Environment variables set in Vercel dashboard
- [x] **DEPL-05**: README with demo credentials and mock service docs

## v2 Requirements

### Batch Projects (7-27 additional apps)

- **BATCH-01**: Task manager
- **BATCH-02**: Inventory tracker
- **BATCH-03**: Expense tracker
- **BATCH-04**: Notes with tags
- **BATCH-05**: Library system
- **BATCH-06**: Job board
- **BATCH-07**: Event ticketing
- **BATCH-08**: Restaurant ordering
- **BATCH-09**: Food delivery sim
- **BATCH-10**: Parking reservation
- **BATCH-11**: Quiz app
- **BATCH-12**: Polls app
- **BATCH-13**: Forum
- **BATCH-14**: Ticket/feedback system
- **BATCH-15**: URL shortener
- **BATCH-16**: Invoice generator
- **BATCH-17**: Budget planner
- **BATCH-18**: Recipe manager
- **BATCH-19**: Password manager (demo)
- **BATCH-20**: Fitness logger
- **BATCH-21**: Weather app (mock API)
- **BATCH-22**: News reader
- **BATCH-23**: Catalog app
- **BATCH-24**: Calculator suite
- **BATCH-25**: Portfolio builder

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real payments | Portfolio scale only, mock payment flow suffices |
| Real emails/SMS | Simulated via DB tables and admin views |
| Real OAuth (Google/GitHub) | Fake login via mock, no real provider integration |
| Rich text WYSIWYG editor | Markdown editor sufficient for demo |
| Real-time WebSockets | Not needed for portfolio demos |
| MySQL/Laravel | Retired — $0 hosting requires Postgres + Vercel |
| Mobile apps | Web-first, mobile later |
| Monorepo | Separate repos for Vercel deployment isolation |
| Custom domains | `.vercel.app` subdomains sufficient for portfolio |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TMPL-01 | Phase 0 | Complete |
| TMPL-02 | Phase 0 | Complete |
| TMPL-03 | Phase 0 | Complete |
| TMPL-04 | Phase 0 | Complete |
| TMPL-05 | Phase 0 | Complete |
| TMPL-06 | Phase 0 | Complete |
| TMPL-07 | Phase 0 | Complete |
| TMPL-08 | Phase 0 | Complete |
| TMPL-09 | Phase 0 | Complete |
| TMPL-10 | Phase 0 | Complete |
| CMS-01 | Phase 1 | Complete |
| CMS-02 | Phase 1 | Complete |
| CMS-03 | Phase 1 | Complete |
| CMS-04 | Phase 1 | Complete |
| CMS-05 | Phase 1 | Complete |
| CMS-06 | Phase 1 | Complete |
| CMS-07 | Phase 1 | Complete |
| CMS-08 | Phase 1 | Complete |
| BOOK-01 | Phase 2 | Complete |
| BOOK-02 | Phase 2 | Complete |
| BOOK-03 | Phase 2 | Complete |
| BOOK-04 | Phase 2 | Complete |
| BOOK-05 | Phase 2 | Complete |
| BOOK-06 | Phase 2 | Complete |
| BOOK-07 | Phase 2 | Complete |
| BOOK-08 | Phase 2 | Complete |
| SHOP-01 | Phase 3 | Pending |
| SHOP-02 | Phase 3 | Complete |
| SHOP-03 | Phase 3 | Complete |
| SHOP-04 | Phase 3 | Pending |
| SHOP-05 | Phase 3 | Complete |
| SHOP-06 | Phase 3 | Complete |
| SHOP-07 | Phase 3 | Complete |
| PORT-01 | Phase 4 | Pending |
| PORT-02 | Phase 4 | Pending |
| PORT-03 | Phase 4 | Pending |
| PORT-04 | Phase 4 | Pending |
| DEPL-01 | Phase 0 | Complete |
| DEPL-02 | Phase 0 | Complete |
| DEPL-03 | Phase 0 | Complete |
| DEPL-04 | Phase 0 | Complete |
| DEPL-05 | Phase 0 | Complete |

**Coverage:**

- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-01*
*Last updated: 2026-08-01 after initial definition*
