---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 4
current_phase_name: Portfolio Shell
status: planning
stopped_at: Phase 3 complete, ready to plan Phase 4
last_updated: "2026-08-02T17:09:18.547Z"
last_activity: 2026-08-03
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 8
  completed_plans: 8
last_activity_desc: Phase 3 complete, transitioned to Phase 4
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-01)

**Core value:** Every project deploys and works end-to-end at zero cost — if it costs money, it doesn't ship.
**Current focus:** Phase 4 — Portfolio Shell (Phase 3 Ecommerce App complete 2026-08-03)

## Current Position

Phase: 4 of 5 (Portfolio Shell)
Plan: Not started
Status: Ready to plan
Last activity: 2026-08-03

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 10
- Average duration: ~1h (40min + ~1h25m)
- Total execution time: ~2h 5m

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 00-template-foundation | 2 | ~2h 5m | ~1h |
| 01-cms-app | 2 | ~4h 52m | ~2h 26m |
| 1 | 2 | - | - |
| 2 | 2 | - | - |
| 3 | 2 | - | - |

**Recent Trend:**

- Last 5 plans: 00-01 (40min), 00-02 (~1h25m)
- Trend: -

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 00 P00-01 | 40 | 3 tasks | 40 files |
| Phase 00-template-foundation P00-02 | 85 | 10 tasks | 62 files |
| Phase 01-cms-app P01-01 | 72 | 4 tasks | 13 files |
| Phase 01-cms-app P01-02 | 220 | 4 tasks | 36 files |
| Phase 02-booking-app P01 | 16min | 3 tasks | 12 files |
| Phase 02-booking-app P02 | 20 | 4 tasks | 17 files |
| Phase 03 P01 | 18 | 3 tasks | 15 files |
| Phase 03 P02 | 40 | 3 tasks | 35 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Next.js + Postgres only — $0 hosting requires Vercel + Neon
- Mock services via lib/mock/* — swappable without touching business logic
- Separate repo per project — each gets own Vercel deployment
- Hand-rolled auth with jose + bcryptjs — no NextAuth, no Prisma, no Redis
- Neon cloud DB for local dev — no local Postgres install needed
- [Phase ?]: shadcn 4.16.1 uses preset flow (radix-nova) — no base-color prompt; baseColor zinc enforced manually per Token authority clause
- [Phase ?]: npm 11.18 EALLOWSCRIPTS blocks CLI-internal installs (CNA/shadcn) — manual dep installs then CLI re-run is the working pattern
- [Phase ?]: create-next-app refuses non-empty dirs with --yes — temp-dir scaffold + copy is the reliable path
- [Phase ?]: Login returns generic 401 on ANY DB error (incl. missing users table pre-seed) — deterministic pre-seed checks + no DB-state enumeration
- [Phase ?]: Proxy Origin check rejects only MISMATCH; missing Origin (curl/scripts) passes — browsers always attach Origin on POST
- [Phase ?]: Server actions return {ok:true}; client navigates + toasts (redirect() would discard return values and lose UI-SPEC toasts)
- [Phase ?]: Seed migration runner splits multi-statement DDL on ';\n' — semicolons inside single-line comments are safe
- [Phase ?]: neon timestamptz rows arrive as JS Date — compare with getTime(), not localeCompare
- [Phase ?]: Server actions broken in this environment (Next 16.2.12 + Windows): verified framework-level, not project code — surfaced as blocking checkpoint for human decision.
- [Phase 1] RESOLVED 2026-08-02: the server-action "Connection closed." defect was a **curl artifact, not an environment defect** — `curl -F` emits lowercase-only multipart boundaries that Next 16's Flight parser rejects; real browsers (mixed-case boundaries, fetch path) work end-to-end, proven with a real headless Chrome against the live Neon DB (create post, edit page, taxonomy create, delete — all POST 200 and persisted). One real app bug found and fixed (Radix AlertDialogAction unmounting forms before submit → `delete-post-dialog.tsx` requestSubmit intercept; later propagated to category/tag tables per REVIEW CR-01). Stack stays on pinned Next 16.2.12. See `.planning/phases/01-cms-app/01-02-SUMMARY.md`.
- [Phase ?]: Sample booking dates resolve to the nth upcoming Tue-Sat template day (nthTemplateDay) instead of fixed +N offsets — fixed offsets drift onto Sunday/Monday where the locked Tue-Sat grid has no slots
- [Phase ?]: depositCents() in lib/booking.ts is the single source of truth for the 25% deposit formula; createBooking and the seed deposit amounts share it
- [Phase ?]: Booking deposit payments are upserted before sample bookings in the seed — bookings.deposit_payment_id FK requires referenced rows to exist first
- [Phase ?]: booking-filters is a client component (onChange auto-submit requires it; PATTERNS.md classifies it client) — GET form still server-renders results
- [Phase ?]: checkbox resolved via unified radix-ui package already in package.json — zero new runtime dependencies this phase
- [Phase ?]: Ecommerce taxonomy stays isolated in shop_categories; checkout uses locked integer-cent snapshots and commits failed payment events without order/cart/inventory writes.
- [Phase ?]: Deterministic Northstar ids/slugs and upserts keep three categories, twelve products, mixed orders, and linked receipts idempotent under the size gate.
- [Phase ?]: Ecommerce UI keeps data reads in force-dynamic server components and limits client code to serializable mutation/pending/toast/navigation behavior.
- [Phase ?]: Owner and admin boundaries converge malformed/stale order reads and illegal lifecycle actions to generic, non-enumerating responses.

### Pending Todos

None yet.

### Blockers/Concerns

None — all Phase 1 blockers resolved (see decision log above).

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-08-02T17:08:44.535Z
Stopped at: Phase 3 complete, ready to plan Phase 4
Resume file: None
