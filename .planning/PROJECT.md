# Free Fullstack Showcase — 30 Portfolio Projects

## What This Is

Build 10–30 simple, fully functional fullstack demo projects, all deployed at $0/month, for portfolio/showcase purposes. Each project is a standalone app with its own repo and Vercel deployment. A reusable `ads-mediatech` template makes every additional project take ~30 min.

## Core Value

Every project deploys and works end-to-end at zero cost — if it costs money, it doesn't ship.

## Requirements

### Validated

- ✓ Template (`ads-mediatech`) with auth, DB pool, mock services, seed script, dark/light theme — Phase 0
- ✓ CMS app — admin CRUD posts, markdown editor, draft/publish, categories/tags, search — Phase 1
- ✓ Booking app — service listing, slot calendar, book flow, admin confirm/cancel, mock email/SMS — Phase 2 (barber shop; atomic double-booking prevention via conditional UPDATE in Pool transaction; optional 25% mock deposit; rolling 14-day seed window)
- ✓ Ecommerce app — Northstar Coffee catalog, persistent cart, mock checkout, atomic inventory, owner confirmation, admin orders, and linked receipt outbox — Phase 3
- ✓ Portfolio shell — responsive grid of all projects with live links, GitHub links, tech badges, demo credentials — Phase 4

### Active

- [ ] 7–27 batch projects (task manager, inventory, expense tracker, job board, quiz, forum, etc.) — v2.0 milestone

### Out of Scope

- Real payments — portfolio scale only, mock payment flow suffices
- Real emails/SMS — simulated via DB tables and admin views
- Real OAuth — fake Google login via mock
- MySQL/Laravel — retired from plan, Postgres only (Neon free tier)
- Mobile apps — web-first, mobile later
- Production traffic — demo/portfolio scale only

## Context

- Stack: Next.js (App Router, TypeScript, Tailwind) + Postgres (Neon free tier)
- Hosting: Vercel Hobby (unlimited projects, 1M invocations/mo)
- All external services mocked via `lib/mock/*` — swappable later without touching business logic
- Local dev: `npm run dev` → connects to Neon cloud DB (same DB for local + prod)
- Each project = own repo = own Vercel deployment = own public URL
- Backend via Next.js Route Handlers (`app/api/*`)

## Constraints

- **Hosting**: Vercel Hobby — personal/non-commercial, 1M invocations/mo, 4h active CPU, 100 GB transfer total
- **Database**: Neon free tier — 0.5 GB/project, 100 CU-hrs/project/mo, scale-to-zero
- **Budget**: $0/month total — no credit card, no billing info on any service
- **Git**: GitHub free account (NARVS1999)
- **File Storage**: Vercel Blob (1 GB) or DB/base64 for demos
- **Secrets**: Never commit — env vars in Vercel dashboard only

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js + Postgres only | $0 hosting on Vercel + Neon; Laravel requires credits/card | ✓ Decided |
| Mock services via lib/mock/* | Swappable later without touching business logic | ✓ Decided |
| Separate repo per project | Each gets own Vercel deployment and public URL | ✓ Decided |
| Neon cloud DB for local dev | No local Postgres install needed; same DB for local + prod | ✓ Decided |
| No real payments/emails/SMS | Portfolio scale only, not production | ✓ Decided |
| Atomic booking via conditional UPDATE in Pool transaction | rowCount-0 = conflict + partial unique index fallback; mock payment/email/SMS join the txn via optional client/bookingId params (Phase 2) | ✓ Decided |
| Atomic ecommerce checkout via locked inventory updates | Mock payment failure commits only its failed event; successful payment, order snapshots, inventory deduction, and cart clear share one transaction | ✓ Decided |
| User-scoped commerce boundaries | Persistent carts are authenticated and owner-scoped; malformed, unknown, and non-owned order ids converge on one not-found response | ✓ Decided |

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

## Current State (v1.0 SHIPPED 2026-08-03)

**Template:** `ads-mediatech` — Next.js 16, TypeScript, Tailwind v4, Neon Postgres, shadcn/ui  
**Deployed:** 4 apps on Vercel (free tier), 4 Neon databases (free tier)  
**Portfolio:** Live at `/` with project grid, links, badges, demo credentials  
**Tested:** 9 test files, 120 tests passing  
**Budget:** $0/month total — all services on free tiers  

## Next Milestone (v2.0)

**Goal:** Scale to 7-27 batch projects using the proven template pattern.  
**Requirements:** BATCH-01 through BATCH-25 defined in v1.0 requirements archive.  
**Start:** `/gsd-new-milestone`

---
*Last updated: 2026-08-03 after Milestone v1.0*
