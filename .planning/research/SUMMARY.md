# Project Research Summary

**Project:** Free Fullstack Showcase — 30 Portfolio Projects
**Domain:** Multi-project portfolio showcase (10-30 demo apps)
**Researched:** 2026-08-01
**Confidence:** HIGH

## Executive Summary

This project builds a portfolio of 10-30 fully deployed fullstack demo applications at $0/month using a reusable Next.js 16 template. The architecture is "template derivation" — copy `nextjs-starter` per project, extend with domain logic, deploy independently. Each project gets its own Vercel deployment and Neon Postgres database. The template provides auth, database, mock services, and UI components so each new project takes ~30 minutes.

The stack is deliberately constrained to avoid costs: Next.js 16 (App Router + React 19 + Tailwind v4), Neon Postgres (0.5 GB free per project), shadcn/ui for components, and hand-rolled auth with jose + bcryptjs. No ORMs — raw SQL via `@neondatabase/serverless`. No NextAuth, no Prisma, no Redis. Every external service (payments, email, SMS, OAuth) gets a mock implementation that matches the real service's API shape.

The critical risks are infrastructure limits: Vercel's 1M invocation limit is account-wide (not per-project), Neon's 0.5 GB storage fills fast with seed data, and 30 separate repos create maintenance burden. The research strongly recommends building budget tracking, storage checks, and template governance into Phase 0 before any project is created. Template divergence is the biggest long-term threat — if each project forks the template independently, the "30 minute" promise breaks.

## Key Findings

### Recommended Stack

The stack is fully resolved with HIGH confidence. Every technology choice has been validated against official documentation and verified at specific versions.

**Core technologies:**
- **Next.js 16.2.12**: Fullstack framework — App Router is standard for 2025+, server components reduce client JS, Turbopack is default bundler
- **React 19.2.8**: Required by Next.js 16 — server components first-class, `use` hook stable
- **TypeScript 5.x**: Type safety — essential for template reuse across 30 projects
- **Tailwind CSS 4.3.3**: CSS-native config (no JS config file), `@import "tailwindcss"`, instant dark mode via `dark:` prefix
- **Neon Postgres (free tier)**: 0.5 GB/project, scale-to-zero, same DB for local + prod

**Database & Auth:**
- **@neondatabase/serverless 1.1.0**: HTTPS/WebSocket driver — works on Vercel serverless (TCP connections fail)
- **jose 6.2.6**: JWT/session signing — zero dependencies, universal runtime, actively maintained
- **bcryptjs 3.0.3**: Password hashing — pure JS, works on Vercel Hobby (no native bindings)
- **Zod 4.4.3**: Input validation + type inference — 2kb, TypeScript-first

**UI:**
- **shadcn/ui 4.16.1**: Component source copied into project (~2kb per component vs 100kb+ for Material UI)
- **lucide-react 1.28.0**: 1500+ tree-shakeable icons

### Expected Features

**Must have (table stakes) — every project needs these or it looks broken:**
- Live deployed URL (hiring managers won't run localhost)
- Demo credentials pre-seeded (`demo@portfolio.dev` / `password123`)
- Working CRUD operations (core fullstack proof)
- Responsive design (mobile/tablet/desktop)
- Dark/light theme toggle
- Loading states & error handling (blank screen = looks broken)
- Clean README with case study (the "first interview")
- Seed data that tells a story (not "Blog Post 1")

**Should have (competitive differentiators):**
- Markdown editor with preview (CMS)
- Prevent double-booking with transactions (Booking)
- Mock payment with success/fail toggle (Ecommerce)
- Category filtering and search (all apps)
- Admin dashboards per project

**Defer to v2+:**
- Real-time collaborative editing (requires WebSockets + CRDTs)
- Rich text WYSIWYG (markdown is better proof of skill)
- Real payment processing (PCI compliance = overkill for demo)
- User roles/permissions (RBAC adds massive auth complexity)
- CMS-driven portfolio content (hardcoded project list is fine)

### Architecture Approach

The architecture is a "template derivation" pattern with strict isolation. Each project copies `nextjs-starter` and extends it with domain-specific routes, schemas, and seed data. Projects are fully independent repos with their own Neon databases and Vercel deployments. The mock service layer uses a Service Provider Interface pattern — mocks implement the same API shape as real services (Stripe, SendGrid) so swapping is a file replacement, not a rewrite.

**Major components:**
1. **nextjs-starter (template)** — Reusable foundation: auth, DB pool, mock services, session management, UI components, seed script
2. **Project repos (N)** — Derived from template, extend with domain routes (`app/api/*`), schema (`schema.sql`), and seed data
3. **Portfolio shell** — Static grid aggregating all projects with live links, GitHub links, tech badges, demo credentials
4. **Mock services layer** — Swappable implementations matching real service API shapes (payment, email, SMS, OAuth, maps, storage)
5. **Data layer** — Isolated Neon Postgres per project (0.5 GB each), no shared databases

### Critical Pitfalls

1. **Vercel invocation limits are account-wide** — 20 projects × 50k invocations = 1M (the limit). Budget explicitly: reserve 10% for portfolio shell, write budget in every README. Use GitHub Actions for anything repetitive.

2. **Neon cold start + Vercel cold start = double blank page** — First visit after idle takes 3-5 seconds. Accept it (portfolio, not production). Document in every README. Use `force-static` on pages that don't need DB.

3. **Template divergence kills the "30 min per project" promise** — After 10 projects, 10 different versions of `auth.ts` emerge. Treat template as a package, not a starting point. Changes go back to template first. Use `TEMPLATE_VERSION` constant.

4. **Seed data bloat fills 0.5 GB fast** — 500 products with base64 images = 0.4 GB. Hard rule: seed data under 200 MB. Use placeholder URLs, never base64 in Postgres. Build `check-storage.sh` into template.

5. **Mock services over-engineered** — 400-line mocks with features the real service doesn't have. Keep mocks under 50 lines. Match the real service's API shape, not your convenience.

## Implications for Roadmap

Based on combined research, the suggested phase structure follows the dependency graph: template first (unblocks everything), flagship apps second (validate template + demonstrate range), portfolio shell third (aggregates projects), batch apps last (factory production).

### Phase 0: Template Foundation
**Rationale:** Everything depends on this. Auth, DB, mocks, seed script, UI components — every project inherits from here. Must be solid and battle-tested before building any app.
**Delivers:** `nextjs-starter` with auth (login/register/logout), Neon DB pool, 6 mock services (payment, email, SMS, OAuth, maps, storage), session management, seed script, shadcn/ui components, `.env.example`, env validation via Zod.
**Addresses:** All table stakes from FEATURES.md (auth, DB, mocks, seed, responsive theme)
**Avoids:** Template divergence (design with config flags, not forks), mock over-engineering (interfaces match real services), missing env validation (Zod schema in `lib/env.ts`), seed data bloat (storage check script)

**Research flags:**
- Neon connection patterns (HTTPS vs WebSocket) — HIGH confidence, documented
- shadcn/ui integration with Tailwind v4 — needs validation during implementation
- Session cookie security (`httpOnly`, `secure`, `sameSite`) — standard patterns, skip research

### Phase 1: CMS App (Blog/Content Management)
**Rationale:** Simplest fullstack pattern (CRUD + relationships). Validates template with first real domain. Most recognizable demo — every hiring manager knows what a CMS should do.
**Delivers:** Post CRUD, markdown editor with preview, categories/tags, admin dashboard, public blog pages, search, seed data with realistic posts.
**Uses:** Template auth, DB pool, Neon Postgres
**Implements:** `app/api/posts/*`, `app/api/categories/*`, `app/api/tags/*`, `schema.sql` (users, posts, categories, tags)
**Addresses:** CMS features from FEATURES.md — post CRUD, markdown, categories, admin dashboard, search
**Avoids:** Demo data that breaks the demo (3-5 realistic posts, not Lorem ipsum), App Router misuse (server components for data display)

### Phase 2: Booking App (Scheduling/Appointments)
**Rationale:** Second flagship, tests mock services (email + SMS confirmations). Adds transaction complexity (prevent double-booking requires atomic operations).
**Delivers:** Service listing, available slots, booking flow with confirmation, admin management, mock email/SMS, seed data with yoga studio classes.
**Uses:** Template auth, DB pool, mock email + SMS services, Neon Postgres transactions (Pool/Client with BEGIN/COMMIT)
**Implements:** `app/api/services/*`, `app/api/slots/*`, `app/api/bookings/*`, schema (users, services, slots, bookings)
**Addresses:** Booking features — prevent double-booking (transaction lock), mock email confirmation, service listing
**Avoids:** Complex availability rules (simple fixed slots), real-time slot updates (standard refresh)

### Phase 3: Ecommerce App (Online Shop)
**Rationale:** Third flagship, most complex mock integration (payment). Demonstrates cart state management and checkout flow.
**Delivers:** Product catalog, shopping cart, checkout with mock payment, order management, inventory deduction, admin orders dashboard.
**Uses:** Template auth, DB pool, mock payment service, Neon Postgres
**Implements:** `app/api/products/*`, `app/api/cart/*`, `app/api/orders/*`, schema (users, products, categories, cart_items, orders, order_items)
**Addresses:** Ecommerce features — cart, checkout, mock payment, inventory
**Avoids:** Real payment processing (mock with success/fail toggle), shipping integration (static status), coupon system (not needed for demo)

### Phase 4: Portfolio Shell
**Rationale:** Depends on Phases 1-3 (needs at least 3 projects to list). The "front door" — first thing hiring managers see.
**Delivers:** Project grid with live links, GitHub links, tech badges, demo credentials, "Simulated X" notes, responsive layout.
**Uses:** Static data (`lib/projects.ts`), no database needed (or `force-static`)
**Implements:** `app/page.tsx` (grid), `lib/projects.ts` (metadata)
**Addresses:** Portfolio shell features — project cards, links, badges, credentials display
**Avoids:** CMS-driven content (hardcoded list is fine), analytics dashboard (use Vercel's built-in)

### Phase 5+: Batch Projects (7-27 simple apps)
**Rationale:** Factory production using template. Each project follows the same pattern: copy template → add domain routes → extend seed → deploy. ~30 minutes each.
**Delivers:** Task Manager, Quiz, Job Board, Expense Tracker, Forum, and 22+ more apps across diverse domains.
**Uses:** Template (Phase 0), established patterns from Phases 1-3
**Addresses:** Batch project features — core CRUD, seed data, demo credentials, README with case study
**Avoids:** Real-time updates (WebSockets), complex auth, third-party integrations (mock everything)

### Phase Ordering Rationale

- **Template → Flagships → Shell → Batch** follows strict dependency graph: template enables everything, flagships validate template, shell aggregates flagships, batch scales the pattern
- **CMS before Booking before Ecommerce** by complexity: CMS is pure CRUD (simplest), Booking adds transactions, Ecommerce adds cart state + payment flow
- **Portfolio shell after flagships** because it needs 3+ projects to be meaningful
- **Batch last** because the template must be proven on real apps before mass production
- **Pitfall mitigation embedded:** Phase 0 builds storage checks, env validation, mock contracts, and template governance — all critical pitfalls are addressed before any project is created

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 0:** shadcn/ui v4 + Tailwind v4 integration specifics (v4 is CSS-native, may need config adjustments)
- **Phase 2:** Neon transaction patterns with `@neondatabase/serverless` Pool/Client (WebSocket config for `ws`)
- **Phase 3:** Mock payment interface design (must match Stripe's API shape for future swapping)

Phases with standard patterns (skip research-phase):
- **Phase 1:** CMS CRUD is well-documented — standard Route Handler patterns
- **Phase 4:** Portfolio shell is static HTML/CSS — no backend complexity
- **Phase 5+:** Batch projects follow established template pattern — no new patterns needed

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npmjs.com, official docs checked (Next.js, Neon, Tailwind, shadcn) |
| Features | HIGH | Feature list derived from PRD with hiring manager feedback patterns; prioritization matrix validated |
| Architecture | HIGH | Template derivation pattern is proven; Neon serverless driver docs confirmed; Vercel limits verified |
| Pitfalls | HIGH | Pitfalls sourced from Vercel/Neon official documentation, known serverless gotchas, portfolio domain expertise |

**Overall confidence:** HIGH

### Gaps to Address

- **shadcn/ui v4 + Tailwind v4 compatibility**: v4 is relatively new; verify CLI init works with CSS-native config during Phase 0 implementation
- **Neon WebSocket pool config**: The `ws` package and `neonConfig.webSocketConstructor` pattern needs validation in serverless environment
- **Vercel invocation monitoring**: No built-in way to track per-project invocation counts; may need a custom health check script
- **Template propagation strategy**: How to handle template updates across 30 independent repos (GitHub Actions? Manual?) — needs practical validation during Phase 4
- **Cold start documentation tone**: Needs to be professional ("optimized for production, first visit may be brief") not apologetic

## Sources

### Primary (HIGH confidence)
- npmjs.com — verified versions: next@16.2.12, react@19.2.8, @neondatabase/serverless@1.1.0, zod@4.4.3, shadcn@4.16.1, bcryptjs@3.0.3, jose@6.2.6, tailwindcss@4.3.3
- Next.js official docs (nextjs.org/docs) — App Router patterns, Route Handlers, server components
- Neon serverless driver docs (@neondatabase/serverless README) — neon() function, Pool/Client, WebSocket config
- Tailwind CSS v4 docs (tailwindcss.com/docs) — PostCSS plugin, CSS-native config
- shadcn/ui docs (ui.shadcn.com) — CLI init, component installation
- Vercel pricing docs (vercel.com/pricing) — Hobby tier limits (1M invocations, 4h CPU, 100GB transfer)
- Neon pricing docs (neon.tech/pricing) — Free tier limits (0.5 GB/project, 100 CU-hrs)

### Secondary (MEDIUM confidence)
- DEV Community portfolio best practices — "Two great projects beat twenty mediocre ones"
- Hiring manager feedback patterns — live deployment, README quality, case studies
- Portfolio industry analysis — what gets callbacks vs ghosted

### Tertiary (LOW confidence)
- Cold start timing estimates (500ms-2s for Neon, combined with Vercel) — needs real-world validation
- 30k invocations/project/month budget estimate — theoretical calculation, actual usage varies

---
*Research completed: 2026-08-01*
*Ready for roadmap: yes*
