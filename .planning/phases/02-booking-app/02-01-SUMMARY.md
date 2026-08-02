---
phase: 02-booking-app
plan: 01
subsystem: database
tags: [neon, postgres, server-actions, zod, seed, transactions, bookings]

# Dependency graph
requires:
  - phase: 00-template-foundation
    provides: lib/db.ts withPool transactions, lib/mock/* services, users table, env contract
  - phase: 01-cms-app
    provides: server action skeleton (FormState/{ok}/23505), isUuid guards, seed upsert patterns, migration ledger runner
provides:
  - 003_booking.sql migration: services/slots/bookings tables + booking_id on mock_emails/mock_sms
  - Atomic createBooking (conditional UPDATE claim + in-txn deposit + insert) with conflict copy
  - Race-safe cancelBooking/cancelBookingAdmin/confirmBooking transactions
  - lib/booking.ts client-safe helpers (bookingRef, depositCents, toDateKey, formatSlotDate/Time, formatUsd)
  - bookingSchema Zod contract (slotId uuid + deposit checkbox preprocess)
  - Rolling 14-day seed: 3 barber services, WEEKLY_TEMPLATE Tue–Sat, 4 re-pointed sample bookings, linked payments/notices
affects: [02-02-plan, booking app UI, admin bookings pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pg-style client.query(text, $n) exclusively inside withPool (never the HTTP sql tagged template)"
    - "Atomic slot claim: conditional UPDATE ... WHERE booked_at IS NULL + rowCount 0 -> conflict copy"
    - "In-transaction mock deposit via optional PoolClient param on payment.createPayment/refund"
    - "Race-safe slot reopen: NOT EXISTS (other active booking on slot) guard"
    - "Rolling-window seed: fixed ids re-pointed via subselects into the current window every run"

key-files:
  created:
    - db/migrations/003_booking.sql
    - lib/booking.ts
    - __tests__/booking.test.ts
    - app/(main)/book/actions.ts
    - app/admin/bookings/actions.ts
  modified:
    - lib/validate.ts
    - lib/mock/payment.ts
    - lib/mock/email.ts
    - lib/mock/sms.ts
    - __tests__/validate.test.ts
    - __tests__/mock.test.ts
    - scripts/seed.ts

key-decisions:
  - "Sample booking dates resolve to the nth upcoming Tue–Sat template day (nthTemplateDay) instead of fixed +N-day offsets — fixed offsets drift onto Sunday/Monday, where the locked Tue–Sat grid has no slots (5 of 7 weekdays)"
  - "Booking deposit payments are upserted BEFORE sample bookings in the seed — the bookings FK (deposit_payment_id) requires referenced rows to exist first"
  - "depositCents() in lib/booking.ts is the single source of truth for the 25% deposit formula; createBooking and seed share it"

requirements-completed: [BOOK-03, BOOK-04, BOOK-05, BOOK-06, BOOK-07, BOOK-08]

coverage:
  - id: D1
    description: "003_booking.sql additive idempotent migration — services, slots, bookings (status CHECK pair, partial unique active-slot index), booking_id columns + indexes on mock_emails/mock_sms"
    requirement: BOOK-04
    verification:
      - kind: other
        ref: "npm run seed ×2 — 003_booking applied via schema_migrations ledger; second run exits 0 as no-op"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mock service extensions — payment.createPayment/refund optional PoolClient (in-transaction branch), email/sms optional bookingId linked into booking_id"
    requirement: BOOK-08
    verification:
      - kind: unit
        ref: "__tests__/mock.test.ts#mock payment client branch (client.query used, module sql skipped)"
        status: pass
    human_judgment: false
  - id: D3
    description: "bookingSchema Zod contract — deposit 'on' → true, null/absent → false, non-UUID slotId rejected"
    requirement: BOOK-03
    verification:
      - kind: unit
        ref: "__tests__/validate.test.ts#bookingSchema (4 cases)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Atomic createBooking — conditional UPDATE claim inside withPool, rowCount 0 → 'That slot was just taken.', 23505 belt-and-braces catch, in-txn deposit, post-commit email/SMS with booking_id"
    requirement: BOOK-04
    verification: []
    human_judgment: true
    rationale: "Server action needs a live session + Neon to exercise end-to-end; unit coverage exists at the testable surfaces (client branch, schema). Behavioral confirmation lands with the 02-02 dialog (plan 02-02) and verify-work."
  - id: D5
    description: "lib/booking.ts pure client-safe helpers pinning UI-SPEC formats (bookingRef #BK-1042, depositCents 25%, toDateKey, 'Tue, Aug 4', '9:00 AM', '$30')"
    verification:
      - kind: unit
        ref: "__tests__/booking.test.ts (9 cases across 6 helpers)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Race-safe cancel/confirm transactions — cancelBooking (owner + upcoming guard), cancelBookingAdmin, confirmBooking with post-commit notice email; NOT EXISTS reopen guard; in-txn refund"
    requirement: BOOK-05
    verification: []
    human_judgment: true
    rationale: "Server actions require a live session + Neon to exercise end-to-end; verified by code review and the seed-level reopen state (f4 slot booked_at NULL). UI confirmation lands with plan 02-02."
  - id: D7
    description: "Rolling 14-day seed — 3 barber services (exact UI-SPEC prices), WEEKLY_TEMPLATE Tue–Sat hourly, slot generation with ::date/::time casts, 4 sample bookings re-pointed each run, linked payments (e4111111 succeeded / e4222222 refunded) and notices (a3111111/a4111111, b3111111/b4111111), TABLES report incl. services/slots/bookings"
    requirement: BOOK-06
    verification:
      - kind: other
        ref: "npm run seed ×2 consecutive (exit 0, idempotent, 8.34 MB < 200 MB) + SQL assertions: 3 active bookings, f4 slot booked_at NULL, 2 emails + 2 sms with booking_id, ledger has 003_booking"
        status: pass
    human_judgment: false

# Metrics
duration: 16min
completed: 2026-08-02
status: complete
---

# Phase 2 Plan 1: Schema + Data Layer Summary

**Atomic booking data layer: 003_booking.sql migration applied to Neon, backwards-compatible mock extensions (in-transaction payment client + booking-linked email/SMS), client-safe lib/booking.ts helpers, bookingSchema contract, createBooking/cancelBooking/confirmBooking/cancelBookingAdmin transactions, and an idempotent rolling 14-day seed — all unit-covered at their testable surfaces**

## Performance

- **Duration:** 16 min
- **Started:** 2026-08-02T10:45:21Z
- **Completed:** 2026-08-02T11:01:00Z
- **Tasks:** 3
- **Files modified:** 12 (5 created, 7 modified)

## Accomplishments

- **BOOK-04 atomic claim:** `UPDATE slots SET booked_at = now() WHERE id = $1 AND booked_at IS NULL` inside `withPool` — rowCount 0 maps to the UI-SPEC conflict copy "That slot was just taken." (never a 500); partial unique index `bookings_active_slot_idx (slot_id) WHERE status <> 'cancelled'` catches the 23505 race as belt-and-braces.
- **BOOK-08 in-transaction deposit:** `payment.createPayment({amount: depositCents(priceCents)}, client)` runs inside the booking transaction via the new optional PoolClient branch — a claim failure or ROLLBACK removes the payment row (no orphan payment, no claimed-without-deposit). All cancel paths refund via `payment.refund(id, client)`.
- **BOOK-06/07 booking-linked notices:** `email.sendEmail({..., bookingId})` / `sms.sendSms({..., bookingId})` persist `booking_id` after COMMIT — verified live: 2 emails + 2 sms rows linked, consumable by the existing /admin/emails + /admin/sms and the upcoming confirmation page.
- **BOOK-03/05 action surface:** `createBooking` returns `{ok: true, bookingId}` for dialog navigation; `cancelBooking` (owner-scoped + upcoming guard), `cancelBookingAdmin`, `confirmBooking` (pending→confirmed + post-commit notice email) all race-safe: the reopen is guarded by `NOT EXISTS (active booking on slot other than the cancelled one)` and returns the generic "This booking no longer exists." on rowCount 0.
- **Client-safe helpers:** `lib/booking.ts` (bookingRef, depositCents, toDateKey, formatSlotDate/formatSlotTime/formatUsd) pins the UI-SPEC Intl formats with zero dependencies and no "server-only".
- **Rolling seed:** 3 barber services (exact UI-SPEC pricing/durations), Tue–Sat 09:00–16:00 hourly slots for the next 14 days (240 slots, `ON CONFLICT DO NOTHING`, explicit `::date`/`::time` casts), 4 sample bookings (f1-f4: 2 confirmed / 1 pending / 1 cancelled) re-pointed into the current window every run via subselects, cancelled booking's slot reopened (`booked_at NULL`), deposit payments succeeded/refunded, linked realistic notices.

## Task Commits

Each task was committed atomically:

1. **Task 1: 003_booking migration + mock extensions + bookingSchema + createBooking (tracer, TDD)**
   - `9c7e1bd` (test) add failing tests for bookingSchema + mock client-branch
   - `d0e3ab1` (feat) implement 003_booking migration + mock extensions + bookingSchema + atomic createBooking
2. **Task 2: lib/booking.ts helpers (TDD)**
   - `2b181f6` (test) add failing test for lib/booking helpers
   - `ede6744` (feat) implement lib/booking helpers
   - *(no refactor commit — implementation landed minimal/clean; tests stayed green)*
3. **Task 3: rolling seed + cancel/confirm transactions**
   - `e85a480` (feat) rolling 14-day seed + cancel/confirm transactions

**Plan metadata:** `(docs commit — pending below)`

## Files Created/Modified

- `db/migrations/003_booking.sql` - services/slots/bookings + status CHECK pair + partial unique active-slot index + booking_id columns/indexes on mock_emails/mock_sms
- `lib/validate.ts` - + bookingSchema (z.uuid slotId, deposit preprocess) + BookingInput type
- `lib/mock/payment.ts` - + optional PoolClient on createPayment/refund (pg-style client.query in-txn branch)
- `lib/mock/email.ts` / `lib/mock/sms.ts` - + optional bookingId linked into booking_id
- `lib/booking.ts` - client-safe pure helpers (bookingRef, depositCents, toDateKey, formatSlotDate/Time, formatUsd)
- `app/(main)/book/actions.ts` - createBooking (atomic claim+deposit+insert) + cancelBooking (owner+upcoming guard, race-safe reopen, refund)
- `app/admin/bookings/actions.ts` - confirmBooking (pending→confirmed + post-commit email) + cancelBookingAdmin (no guards, race-safe reopen, refund)
- `scripts/seed.ts` - SERVICES, WEEKLY_TEMPLATE, 14-day slot loop, SAMPLE_BOOKINGS re-pointing, BOOKING_PAYMENTS, booking-linked notices, TABLES report
- `__tests__/booking.test.ts` - 9 unit tests for the six helpers
- `__tests__/validate.test.ts` - + 4 bookingSchema cases
- `__tests__/mock.test.ts` - + 2 fake-client branch cases (legacy cases untouched and green)

## Decisions Made

- **nthTemplateDay over fixed +N day offsets** — the plan's `daysAhead` 1-4 sample data lands on Sunday/Monday (no template slots) on 5 of 7 weekdays, breaking the slot_id subselect; bookings now resolve to the 1st..4th upcoming Tue–Sat day, keeping the plan's ordering (f3 nearest → f4 farthest) intact under any run day.
- **Deposit payments upserted before sample bookings** — FK ordering requires the referenced mock_payments rows to exist before bookings insert (first seed run hit `bookings_deposit_payment_id_fkey`).
- **depositCents() as single source of truth** — createBooking and (via shared formula) the seed deposit amounts both derive from `Math.round(price_cents * 0.25)` in lib/booking.ts; no inline duplicate remains.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Seed FK ordering — deposit payments inserted after bookings**
- **Found during:** Task 3 (seed extension)
- **Issue:** The first seed run failed with `bookings_deposit_payment_id_fkey` — SAMPLE_BOOKINGS upsert referenced deposit payment ids that BOOKING_PAYMENTS inserted later in the same function.
- **Fix:** Moved the BOOKING_PAYMENTS upsert block before the SAMPLE_BOOKINGS loop with a comment documenting the FK ordering requirement.
- **Files modified:** scripts/seed.ts
- **Verification:** npm run seed exits 0; mock_payments count 4 (2 Phase-0 + 2 deposit rows); bookings carry deposit_payment_id.
- **Committed in:** e85a480 (Task 3 commit)

**2. [Rule 1 - Bug] Sample bookings drift onto days with no template slots (5 of 7 weekdays)**
- **Found during:** Task 3 (seed extension)
- **Issue:** Fixed `daysAhead` 1-4 relative to the run date lands bookings on Sunday/Monday, which the locked Tue–Sat WEEKLY_TEMPLATE never schedules → the slot_id subselect returned NULL → `null value in column "slot_id"` NOT-NULL violation (reproduced on a Sunday run; latent on 5 of 7 weekdays).
- **Fix:** Replaced raw offsets with `nthTemplateDay(n)` — the date of the nth upcoming day present in WEEKLY_TEMPLATE (f3 → 1st, f1 → 2nd, f2 → 3rd, f4 → 4th), preserving the plan's relative ordering and mixed-status demo under any run day.
- **Files modified:** scripts/seed.ts
- **Verification:** npm run seed twice exits 0; bookings always land in the current window on open days (verified via SQL: 3 active bookings, f4's slot reopened).
- **Committed in:** e85a480 (Task 3 commit)

**3. [Rule 1 - Bug] Orphaned addDays() helper**
- **Found during:** Task 3 (post-fix lint run)
- **Issue:** Fix #2 removed the only call site of `addDays`, producing a new `@typescript-eslint/no-unused-vars` warning in seed.ts.
- **Fix:** Deleted the unused function.
- **Files modified:** scripts/seed.ts
- **Verification:** npm run lint — 0 errors (remaining 7 warnings pre-exist in components/posts/markdown-components.tsx, out of scope).
- **Committed in:** e85a480 (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - bug, all within Task 3's seed work)
**Impact on plan:** All three were correctness fixes required for the seed to run at all; no scope creep, no API/schema changes from plan.

## Issues Encountered

- First seed run failed on FK ordering (deviation 1) and the second on the slot_id NULL (deviation 2) — both resolved by reordering/computation fixes; subsequent runs are clean and idempotent. No other issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-02 (UI: /services, /book, /booking/[id], /admin/bookings pages + booking-dialog/slot-picker components) binds to a fully persisted, tested data layer: `bookingSchema` field names (slotId, deposit) are the exact hidden-field contract the dialog submits; `formatSlotDate`/`formatSlotTime`/`formatUsd` are the format contract pages import; the availability query shape is documented in 02-RESEARCH Pattern 5.
- Human-check pending from the plan (not required to close): after 02-02 lands, /book should show 3 taken pills (2 confirmed + 1 pending) and the cancelled booking's slot available.
- No blockers. Zero new dependencies, zero new env vars, proxy.ts untouched.

---
*Phase: 02-booking-app*
*Completed: 2026-08-02*

## Self-Check: PASSED

- All 13 plan files exist on disk (5 created, 7 modified, SUMMARY).
- All 5 task commits exist in git log: `9c7e1bd`, `d0e3ab1`, `2b181f6`, `ede6744`, `e85a480`.
- Verification battery (final run): 91 tests / 7 files pass, `npx tsc --noEmit` clean, `npm run lint` 0 errors, `npm run seed` exits 0 on two consecutive runs (idempotent, 8.34 MB < 200 MB).
