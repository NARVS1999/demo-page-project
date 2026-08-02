# Phase 2: Booking App - Context

**Gathered:** 2026-08-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Second flagship project that validates the template's mock services (email + SMS confirmations) and transaction handling: a service scheduling app where users browse services, see open time slots on a rolling 14-day calendar display, book slots atomically (double-booking prevention), and admins manage bookings (confirm/cancel) while viewing mock email/SMS confirmations persisted to the database. Builds on the Phase 0 template (auth, raw SQL, mock services, shadcn UI) and Phase 1 patterns (admin shell sections, server actions with {ok} returns + toasts).

</domain>

<decisions>
## Implementation Decisions

### Booking Schema & Transaction Model
- Pre-generated slot rows per service+date+time — availability = slot not yet booked; bookings table references the slot
- Double-booking prevention: atomic conditional UPDATE inside a Pool transaction (`UPDATE slots SET ... WHERE id = $1 AND booked_at IS NULL`), rowcount check → 0 rows means "already taken" — no two users can claim the same slot
- Optional 25% deposit via existing lib/mock/payment createPayment at booking time (BOOK-08) — refund on admin/user cancellation
- Users cancel their own upcoming bookings; admin can confirm or cancel; cancelled slots reopen for booking

### Slot Calendar UX
- Rolling 14-day list grouped by date — each day shows that service's time-slot pills with available/taken states; mobile-friendly over a month grid
- Single-page booking flow: pick service → date → slot → confirm via dialog
- Dedicated `/booking/[id]` confirmation page — shareable, shows the mock email/SMS notices sent
- Login required to book (reuses template auth + ownership-scoped queries); browsing services and slot availability stays public

### Admin Management & Notifications
- New `/admin/bookings` section in the existing AdminShell — table with service, user, date/time, status, and confirm/cancel actions
- Status model: `pending → confirmed → cancelled` (new bookings start pending; user or admin cancel)
- Mock email/SMS visibility reuses existing `/admin/emails` + `/admin/sms` pages — mock services already persist there; no new notification UI
- Admin filters: by status and by service, date-sorted

### Demo Data & Domain
- Barber shop theme with 3 services: Haircut, Beard Trim, Haircut + Beard combo (user-selected over yoga)
- Weekly recurring schedule template per service (days + times) → seed generates slots for the next 14 days
- Sample bookings with mixed statuses (2 confirmed, 1 pending, 1 cancelled), each with linked mock email/SMS rows — realistic demo data, never Lorem ipsum
- Seed idempotency: upserts keyed on service slugs + slot times; re-running seed stays under 200 MB

### the agent's Discretion
- Exact component structure, column layout, and page composition details
- Choice of shadcn components beyond the core set (table, card, badge, dialog, select, alert-dialog, empty-state, stat-card)
- How the booking confirmation page presents mock notification details

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Template auth: jose JWT httpOnly cookie, lib/session.ts getCurrentUser, proxy guard for /admin and /api/*
- Mock services: lib/mock/email.ts sendEmail({to, subject, text}) → mock_emails; lib/mock/sms.ts sendSms({to, message}) → mock_sms; lib/mock/payment.ts createPayment({amount, currency, fail}) → mock_payments — all already viewable at /admin/emails and /admin/sms
- UI: shadcn/ui components (button, card, dialog, select, table, badge, alert-dialog, dropdown-menu, empty-state, error-state, page-header, stat-card, skeleton, sonner), AppShell + AdminShell layouts, dark/light theme
- Admin shell sections pattern from Phase 1 (categories, tags, emails, sms pages)
- Seed: scripts/seed.ts with migration ledger, ON CONFLICT upserts, size report < 200 MB gate

### Established Patterns
- Raw SQL via @neondatabase/serverless (neon() tagged templates + Pool for transactions)
- `export const dynamic = 'force-dynamic'` on every DB-reading page/route
- Zod 4 validation (lib/validate.ts schemas), bcryptjs only in handlers
- lib/env.ts server-only env validation, lib/db.ts typed helpers
- Ownership-scoped SQL (WHERE user_id), generic 401/404 anti-enumeration
- Server actions return {ok: true}; client navigates + toasts
- Migration files in db/migrations/ applied by seed; Upsert-based idempotent seed

### Integration Points
- New 003_booking.sql migration: services, slots, bookings tables (+ optional deposit reference to mock_payments)
- AdminShell: add bookings management section
- AppShell (main) group: public service browsing under /services routes, /booking/[id] confirmation
- Seed script: extend with 3 barber services, weekly schedule template, 14-day slot generation, sample bookings + mock email/SMS rows
- lib/mock payment for deposit; sendEmail/sendSms at booking confirm/cancel points

</code_context>

<specifics>
## Specific Ideas

- Barber shop chosen over the ROADMAP's yoga studio example — user-selected domain in discussion
- No other specific references beyond accepted tables — standard approaches per discussion

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>
