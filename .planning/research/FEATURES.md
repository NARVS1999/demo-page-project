# Feature Research

**Domain:** Free fullstack portfolio showcase (10-30 demo apps)
**Researched:** 2026-08-01
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

These features are non-negotiable. Hiring managers spend ~3 minutes per project. Missing these = immediate dismissal.

| Feature | Why Expected | Complexity | Applicable To |
|---------|--------------|------------|---------------|
| Live deployed URL | "If it's not deployed, it doesn't exist" — hiring managers won't run localhost | LOW | All |
| Demo credentials pre-seeded | Users can't explore if they can't log in | LOW | All |
| Working CRUD operations | Core proof you can build fullstack | MEDIUM | All |
| Responsive design (mobile/tablet/desktop) | Looks broken on phone = looks broken | LOW | All |
| Dark/light theme toggle | Modern apps have it; missing = dated feel | LOW | All |
| Loading states & error handling | Blank screen on slow DB = looks broken | LOW | All |
| Clean README with case study | "The README is your first interview" — explains problem, approach, tradeoffs | LOW | All |
| Tech stack badges in portfolio | Quick scan for tech familiarity | LOW | Portfolio shell |
| Git repo link per project | Hiring managers check commit history | LOW | Portfolio shell |
| Seed data that tells a story | Empty app = useless demo; "Blog Post 1" = lazy | LOW | All |

**Shared template features (built once in ads-mediatech):**
- Auth (login/register/logout with session cookies)
- Database pool (`lib/db.ts`) with connection management
- Mock services layer (`lib/mock/*`) for payment, email, SMS, OAuth
- Layout with nav, sidebar, loading/error boundaries
- Input validation helpers (`lib/validate.ts`)
- Route protection middleware (`lib/auth.ts`)
- Seed script (`npm run seed`) with realistic demo data

### CMS App (Blog/Content Management)

| Feature | Category | Why | Complexity | Notes |
|---------|----------|-----|------------|-------|
| Post CRUD (create, read, update, delete) | Table Stakes | Core CMS functionality | LOW | Standard CRUD pattern |
| Markdown editor with preview | Table Stakes | Blog authors write in markdown | MEDIUM | Use textarea + live preview, not full WYSIWYG |
| Draft/Publish status | Table Stakes | Real CMSs have workflow states | LOW | Boolean field + enum |
| Categories & tags | Table Stakes | Content organization is expected | LOW | Simple many-to-many |
| Image upload (mock) | Table Stakes | Posts without images look bare | LOW | Vercel Blob or base64 |
| Search posts by title/content | Table Stakes | Basic discoverability | LOW | `ILIKE` on Postgres |
| Public blog list page | Table Stakes | Visitor-facing side | LOW | Paginated list |
| Single post page with metadata | Table Stakes | SEO and sharing | LOW | Title, date, author, tags |
| Admin dashboard (post list + actions) | Table Stakes | Management interface | LOW | Table with edit/delete buttons |
| Category/tag management | Table Stakes | Admin needs to organize | LOW | CRUD for categories/tags |
| Post scheduling (publish date) | Differentiator | Shows understanding of content workflows | MEDIUM | Date field + cron check |
| SEO preview (og tags, meta) | Differentiator | Modern CMSs show social preview | MEDIUM | `generateMetadata` in Next.js |
| Post view count | Differentiator | Simple analytics proof | LOW | Increment on read |
| Multi-author support | Differentiator | Shows relational data modeling | MEDIUM | Author foreign key + display |
| RSS feed generation | Differentiator | Real blogs have RSS | LOW | Route handler returning XML |
| **Real-time collaborative editing** | Anti-Feature | Requires WebSockets, CRDTs, conflict resolution — massive complexity | — | Use markdown + save instead |
| **Rich text WYSIWYG** | Anti-Feature | Custom WYSIWYG is a full project; markdown is sufficient | — | Markdown editor is better proof of skill |
| **User roles/permissions** | Anti-Feature | RBAC adds significant auth complexity | — | Single admin role via seed data |
| **Content versioning** | Anti-Feature | Requires version history table, diff rendering, restore logic | — | Draft/publish is enough |

### Booking App (Scheduling/Appointments)

| Feature | Category | Why | Complexity | Notes |
|---------|----------|-----|------------|-------|
| Service listing page | Table Stakes | Users need to see what's bookable | LOW | Card grid of services |
| Available time slots display | Table Stakes | Core booking UX | MEDIUM | Query slots where not booked |
| Book a slot (one-click flow) | Table Stakes | The actual booking action | MEDIUM | Transaction: create booking + mark slot taken |
| Booking confirmation page | Table Stakes | User needs to know it worked | LOW | Success page with details |
| Admin booking management | Table Stakes | View all bookings, confirm/cancel | LOW | Table with status actions |
| Prevent double-booking | Table Stakes | Two users can't book same slot | MEDIUM | Database constraint or transaction lock |
| Mock email confirmation | Table Stakes | Booking apps send confirmations | LOW | Save to `emails` table + admin view |
| Service details page | Table Stakes | Users need info before booking | LOW | Name, description, duration, price |
| My Bookings (user view) | Differentiator | Users want to see their history | MEDIUM | Filter bookings by current user |
| Booking status tracking | Differentiator | Pending → Confirmed → Completed lifecycle | LOW | Status enum field |
| Mock SMS reminder | Differentiator | Shows notification architecture thinking | LOW | Log to `sms` table |
| Recurring bookings | Differentiator | Advanced scheduling pattern | HIGH | Weekly重复 pattern — complex but impressive |
| Waitlist for full slots | Differentiator | Real booking apps have this | MEDIUM | Secondary table + trigger on cancel |
| Calendar view (month grid) | Differentiator | Visual booking interface | MEDIUM | CSS grid calendar, not a library |
| **Real-time slot updates** | Anti-Feature | Requires WebSockets, adds hosting complexity | — | Standard page refresh is fine for demo |
| **Payment deposit** | Anti-Feature | Mock payment is sufficient; real payment = PCI compliance | — | Mock payment flow |
| **Complex availability rules** | Anti-Feature | Business hours, exceptions, timezone handling = weeks of work | — | Simple fixed slots per service |

### Ecommerce App (Online Shop)

| Feature | Category | Why | Complexity | Notes |
|---------|----------|-----|------------|-------|
| Product catalog with images | Table Stakes | Core shopping experience | LOW | Grid of product cards |
| Product detail page | Table Stakes | Users need full info before buying | LOW | Image, description, price, stock |
| Category filtering | Table Stakes | Browse by category | LOW | Query param filter |
| Shopping cart (add/remove/update qty) | Table Stakes | Essential ecommerce flow | MEDIUM | Session or DB-based cart |
| Checkout flow | Table Stakes | The purchase action | MEDIUM | Address → payment → confirmation |
| Mock payment (success/fail toggle) | Table Stakes | Simulates real payment | LOW | 3s delay + success screen |
| Order confirmation page | Table Stakes | User needs receipt | LOW | Order details + items |
| Admin orders dashboard | Table Stakes | View/manage all orders | LOW | Table with status actions |
| Inventory deduction on purchase | Table Stakes | Stock management is expected | LOW | Decrement on order creation |
| Product search | Table Stakes | Find specific products | LOW | `ILIKE` search |
| Cart persistence (logged in) | Differentiator | Cart survives page refresh | MEDIUM | DB-backed cart vs session |
| Wishlist / save for later | Differentiator | Common ecommerce feature | LOW | Secondary table |
| Product reviews/ratings | Differentiator | Social proof pattern | MEDIUM | Star rating + text review |
| Order history (user view) | Differentiator | Users want purchase history | LOW | Filter orders by user |
| Stock alerts (low stock badge) | Differentiator | Shows inventory awareness | LOW | Conditional badge rendering |
| **Real payment processing** | Anti-Feature | PCI compliance, Stripe fees, tax calculations | — | Mock payment flow |
| **Shipping integration** | Anti-Feature | API contracts, tracking, rate calculation | — | Static "Shipped" status |
| **Multi-vendor/marketplace** | Anti-Feature | Adds seller auth, commission logic, split payments | — | Single-vendor store |
| **Coupon/discount system** | Anti-Feature | Code generation, expiry, stacking rules | — | Not needed for demo |

### Portfolio Shell (Project Showcase)

| Feature | Category | Why | Complexity | Notes |
|---------|----------|-----|------------|-------|
| Project grid/cards | Table Stakes | The core showcase interface | LOW | Responsive grid of cards |
| Live demo link per project | Table Stakes | Users need to click through | LOW | External link |
| GitHub repo link per project | Table Stakes | Hiring managers check code | LOW | External link |
| Tech stack badges per project | Table Stakes | Quick tech scan | LOW | Colored badges |
| Demo credentials display | Table Stakes | Users can't explore without login info | LOW | Credential card per project |
| "Simulated X" note per card | Table Stakes | Sets expectations about mocks | LOW | Badge or footnote |
| Project description/summary | Table Stakes | Context for each project | LOW | Short paragraph |
| Responsive grid layout | Table Stakes | Works on all devices | LOW | CSS grid/tailwind |
| Project filtering by category | Differentiator | Browse by type (management, marketplace, etc.) | LOW | Tag-based filter |
| Tech stack filter | Differentiator | Find projects using specific tech | LOW | Checkbox filter |
| Project detail page | Differentiator | Deeper view per project | MEDIUM | Full case study page |
| Search projects | Differentiator | Find specific projects quickly | LOW | Text search |
| Total project count | Differentiator | Shows portfolio scale | LOW | Counter display |
| Last updated timestamp | Differentiator | Shows active development | LOW | Date field |
| **CMS-driven content** | Anti-Feature | Portfolio shell is static enough; CMS adds complexity | — | Hardcoded project list is fine |
| **Comments/guestbook** | Anti-Feature | Requires moderation, spam filtering | — | Contact form instead |
| **Analytics dashboard** | Anti-Feature | Overkill for portfolio; Vercel analytics is free | — | Use Vercel's built-in analytics |
| **Authentication for portfolio** | Anti-Feature | Portfolio is public; auth adds friction | — | Public access |

### Batch Projects (7-27 Simple Apps)

These follow a "vertical slice" pattern — each app is self-contained, demonstrates a specific domain, and reuses the template.

| Feature | Category | Why | Complexity | Notes |
|---------|----------|-----|------------|-------|
| Core CRUD for domain entity | Table Stakes | Proves you can build the app | LOW | Standard pattern per project |
| Seed data with realistic content | Table Stakes | Empty app = useless demo | LOW | 10-20 records per entity |
| Demo credentials + pre-seeded user | Table Stakes | Instant access for evaluators | LOW | From template |
| Deployed URL that works | Table Stakes | Must be reachable | LOW | Vercel auto-deploy |
| README with problem statement | Table Stakes | Explains what and why | LOW | Template-based |
| Domain-specific filtering/sorting | Differentiator | Shows understanding of the domain | LOW | Query params |
| Simple dashboard/stats | Differentiator | One screen summary | LOW | Aggregate queries |
| Export to CSV | Differentiator | Common business need | MEDIUM | Server-side CSV generation |
| Pagination | Differentiator | Handles larger datasets | LOW | Offset/limit pattern |
| **Real-time updates** | Anti-Feature | WebSockets = hosting complexity | — | Standard refresh |
| **Complex auth** | Anti-Feature | OAuth, roles, permissions = auth project | — | Credentials only |
| **Third-party integrations** | Anti-Feature | API keys, rate limits, costs | — | Mock everything |

**Per-project feature mapping (from PRD Section 9):**

| Project | Core Entity | Key Features | Differentiator Pick |
|---------|-------------|--------------|---------------------|
| Task Manager | tasks | CRUD, status (todo/done), priority | Kanban board view |
| Inventory | items | CRUD, stock levels, categories | Low stock alerts |
| Expense Tracker | expenses | CRUD, categories, date range | Monthly summary chart |
| Notes w/ tags | notes | CRUD, tags, search | Tag-based filtering |
| Library System | books | CRUD, borrow/return, availability | Due date tracking |
| Job Board | jobs | CRUD, applications, company info | Application status flow |
| Event Ticketing | events | CRUD, tickets, attendee list | Capacity management |
| Restaurant Ordering | menu items | Menu, cart, order status | Order status timeline |
| Food Delivery Sim | restaurants | Browse, cart, delivery status | Delivery tracking mock |
| Parking Reservation | spots | Available spots, reserve, release | Time-based pricing |
| Quiz | questions | Create quiz, take quiz, score | Timer + leaderboard |
| Polls | polls | Create poll, vote, results | Real-time results bar |
| Forum | posts | Threads, replies, categories | Thread sorting by activity |
| Ticket/Feedback | tickets | Submit, status, admin reply | Status workflow |
| URL Shortener | urls | Shorten, redirect, click count | Click analytics |
| Invoice Generator | invoices | Create, PDF preview, client info | Line item math |
| Budget Planner | budgets | Set budgets, track spending | Progress bars |
| Recipe Manager | recipes | CRUD, ingredients, steps | Serving size calculator |
| Password Manager (demo) | passwords | CRUD, master password, encrypt | Password strength meter |
| Fitness Logger | workouts | Log exercises, sets, reps | Weekly summary |
| Weather (mock API) | forecasts | Display mock weather data | 7-day forecast grid |
| News Reader | articles | List, read, categorize | Bookmark feature |
| Catalog App | products | Browse, search, details | Comparison view |
| Calculator Suite | calculations | Multiple calculator types | History log |
| Portfolio Builder | projects | Add projects, reorder, preview | Theme selector |

## Feature Dependencies

```
[Template: Auth]
    └──requires──> [Session management]
                       └──requires──> [Postgres sessions table]

[Template: Mock Services]
    └──requires──> [lib/mock/* files]

[CMS: Draft/Publish]
    └──requires──> [Post CRUD]

[CMS: Admin Dashboard]
    └──requires──> [Auth] + [Post CRUD]

[Booking: Prevent Double-Booking]
    └──requires──> [Slot management] + [Database transaction]

[Booking: Mock Email Confirmation]
    └──requires──> [Booking creation] + [Mock email service]

[Ecommerce: Checkout Flow]
    └──requires──> [Cart] + [Mock payment] + [Order creation]

[Ecommerce: Inventory Deduction]
    └──requires──> [Order creation] + [Product stock field]

[Portfolio Shell: Project Cards]
    └──requires──> [Project list data]

[Batch Projects: All]
    └──requires──> [Template: Auth] + [Template: DB pool]
```

### Dependency Notes

- **Template: Auth requires Session management:** Every project needs login; sessions are stored in Postgres for zero-cost
- **Booking: Prevent Double-Booking requires Database transaction:** Must be atomic — check slot availability + create booking in one transaction
- **Ecommerce: Checkout requires Cart + Mock payment:** Cart stores selections, payment simulates processing, order records the transaction
- **All batch projects require Template:** The entire point is reusability — template must be solid before batch production begins

## MVP Definition

### Launch With (v1) — Template + 4 Flagship Apps

- [ ] Template with auth, DB, mock services, seed script — **enables everything else**
- [ ] CMS app with post CRUD, markdown, categories, admin — **most recognizable fullstack pattern**
- [ ] Booking app with slots, booking flow, admin — **demonstrates transaction logic**
- [ ] Ecommerce app with catalog, cart, checkout, orders — **demonstrates state management**
- [ ] Portfolio shell with project cards, links, badges — **the front door to all projects**

**Why this order:** Template enables all apps. CMS is the simplest fullstack pattern (CRUD + relationships). Booking adds transaction complexity. Ecommerce adds cart state + checkout flow. Portfolio shell ties them together.

### Add After Validation (v1.x)

- [ ] First 5 batch projects (highest domain variety): Task Manager, Quiz, Job Board, Expense Tracker, Forum
- [ ] Add filtering/search to portfolio shell
- [ ] Project detail pages with case studies

### Future Consideration (v2+)

- [ ] Remaining batch projects (up to 27 total)
- [ ] Export features (CSV, PDF)
- [ ] Dashboard/stats per project
- [ ] Advanced differentiators (calendar view, kanban, real-time results)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Live deployed URL | HIGH | LOW | P1 |
| Demo credentials | HIGH | LOW | P1 |
| Working CRUD | HIGH | MEDIUM | P1 |
| Responsive design | HIGH | LOW | P1 |
| README with case study | HIGH | LOW | P1 |
| Dark/light theme | MEDIUM | LOW | P1 |
| Post CRUD (CMS) | HIGH | LOW | P1 |
| Markdown editor (CMS) | HIGH | MEDIUM | P1 |
| Service listing (Booking) | HIGH | LOW | P1 |
| Book a slot (Booking) | HIGH | MEDIUM | P1 |
| Product catalog (Ecommerce) | HIGH | LOW | P1 |
| Cart + checkout (Ecommerce) | HIGH | MEDIUM | P1 |
| Project cards (Portfolio) | HIGH | LOW | P1 |
| Mock payment | HIGH | LOW | P1 |
| Category filtering | MEDIUM | LOW | P2 |
| Search functionality | MEDIUM | LOW | P2 |
| Admin dashboards | MEDIUM | LOW | P2 |
| Order history | MEDIUM | LOW | P2 |
| Product reviews | MEDIUM | MEDIUM | P2 |
| Calendar view (Booking) | MEDIUM | MEDIUM | P2 |
| Export to CSV | MEDIUM | MEDIUM | P2 |
| RSS feed (CMS) | LOW | LOW | P3 |
| SEO preview (CMS) | LOW | MEDIUM | P3 |
| Recurring bookings | LOW | HIGH | P3 |
| Multi-author (CMS) | LOW | MEDIUM | P3 |

## Competitor Analysis

| Feature | Typical Portfolio (Todo App) | This Showcase | Our Advantage |
|---------|------------------------------|---------------|---------------|
| Number of projects | 1-5 similar apps | 10-30 diverse domains | Shows range and productivity |
| Domain variety | Todo, weather, calculator | CMS, booking, ecommerce, 25+ domains | Demonstrates adaptability |
| Deployment | Some localhost, some deployed | All deployed at $0 | Professional finish |
| Mock services | None or hardcoded | Swappable mock layer | Shows architectural thinking |
| Documentation | Basic or missing | Case study per project | Tells the story, not just shows code |
| Template reuse | Each project from scratch | Factory pattern (~30 min each) | Shows efficiency and DRY principles |
| Cost | Often requires paid services | Strictly $0/month | Constraint-driven creativity |

## Sources

- DEV Community portfolio best practices (2026) — "Two great projects beat twenty mediocre ones"
- Hiring manager feedback patterns — live deployment, README quality, case studies
- Next.js App Router documentation — Route Handlers, server components, metadata API
- PRD.md (project-specific) — constraints, stack decisions, project list
- Portfolio industry analysis — what gets callbacks vs what gets ghosted

---
*Feature research for: Free Fullstack Showcase (30 Portfolio Projects)*
*Researched: 2026-08-01*
