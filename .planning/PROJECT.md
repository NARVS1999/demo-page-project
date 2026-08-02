# ads-mediatech

## What This Is

A fullstack demo template for a portfolio of ~30 apps. Ships with auth, mock services, a blog, an ecommerce shop, and a booking system — all backed by Neon Postgres. Designed to be forked per-app with minimal configuration.

## Core Value

Every fork works out of the box: register, login, browse blog, shop products, book services — all against real database rows, not static mockups.

## Requirements

### Validated

- ✓ Auth with bcrypt + jose JWT in httpOnly cookie — shipped v0.1.0
- ✓ Mock services (payments, email, SMS, OAuth, maps, storage) — shipped v0.1.0
- ✓ Blog with markdown editor, categories, tags, search — shipped v0.1.0
- ✓ Shop with catalog, cart, checkout, inventory — shipped v0.1.0
- ✓ Booking with slot calendar, confirm/cancel, notifications — shipped v0.1.0
- ✓ Admin views for orders, bookings, emails, payments — shipped v0.1.0

### Active

- [ ] Philippine Peso (₱) currency localization across all shop and booking UI
- [ ] Real product/blog images replacing picsum.photos placeholders

### Out of Scope

- Real payment processing — mock only for demo purposes
- OAuth login — email/password sufficient for template
- Mobile app — web-first, responsive design
- Internationalization beyond ₱ — single locale for now

## Context

- Stack: Next.js 16 (App Router, TypeScript, Tailwind v4, Turbopack), shadcn/ui, Neon Postgres via raw SQL
- Auth: jose JWT sessions, bcryptjs hashing
- Database: dual Neon URLs (pooled for app, direct for migrations)
- Testing: vitest with 120+ unit tests
- Template version: 0.1.0 (in lib/site.ts)
- Seed data: 5 blog posts, 12 shop products, 4 bookings — all with deterministic UUIDs

## Constraints

- **Tech stack**: Next.js 16 App Router, no ORM, raw SQL only
- **Server-only boundaries**: lib/db.ts, lib/session.ts, lib/mock/* must start with `import "server-only"`
- **proxy.ts not middleware.ts**: Next 16 convention
- **force-dynamic**: Every DB-reading page/route handler
- **bcryptjs only in route handlers/seed**: Never in proxy.ts or pages
- **Migrations**: Idempotent SQL files with schema_migrations ledger

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Raw SQL over ORM | Zero magic, full control, template simplicity | ✓ Good |
| jose JWT over sessions table | Small, auditable, no extra table | ✓ Good |
| Mock services with `mock`/`real` switch | Demo without real providers, easy swap path | ✓ Good |
| ₱ over $ | Philippine peso localization for target audience | — Pending |
| Local images over picsum URLs | Real product imagery, offline capability | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-03 after milestone v1.0 initialization*
