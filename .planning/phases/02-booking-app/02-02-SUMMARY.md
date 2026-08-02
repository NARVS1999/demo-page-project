---
phase: 02-booking-app
plan: 02
subsystem: ui
tags: [react, nextjs, server-actions, radix, shadcn, booking, admin]

# Dependency graph
requires:
  - phase: 02-booking-app
    provides: "02-01: atomic createBooking/cancelBooking/confirmBooking/cancelBookingAdmin actions, bookingSchema (slotId/deposit), lib/booking.ts format helpers, rolling 14-day seed with 3 services + 4 sample bookings + linked notices/payments"
provides:
  - "Public /services listing (3 radio-style service cards, Book this CTA)"
  - "/book single-page flow: service radiogroup + 14-day slot calendar + sticky confirm bar + booking-dialog"
  - "booking-dialog: useActionState(createBooking) with hidden slotId + deposit checkbox, conflict/payment Alerts, success toast + push"
  - "/booking/[id] shareable confirmation: summary card + notices section + owner cancel (alert-dialog + requestSubmit intercept, deposit-suffix toast)"
  - "/admin/bookings: GET filter bar (status/service), soonest-first table, per-row confirm/cancel dialogs, count line, EmptyState variants"
  - "AdminShell Bookings group (CalendarCheck) + admin overview Bookings StatCard (CalendarClock)"
affects: [02-03-plan (if any), verify-work, gsd-verify]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-dialog-over-server-action: useActionState + toast + deferred close + router.refresh (category-dialog pattern)"
    - "Radix AlertDialog requestSubmit intercept — AlertDialogAction auto-closes before implicit form submission; intercept click + formRef.requestSubmit()"
    - "GET filter form with native selects + onChange -> form.submit() (server-rendered results, no client fetch)"
    - "Conditional SQL fragments for optional WHERE clauses in a single parametrized query (status/service filters)"
    - "force-dynamic on every DB-reading page; isUuid -> notFound() before SQL"

key-files:
  created:
    - components/booking/booking-dialog.tsx
    - components/booking/booking-confirmation.tsx
    - app/(main)/booking/[id]/{page,loading,error,not-found}.tsx
    - app/admin/bookings/{page,loading,error}.tsx
    - components/admin/booking-filters.tsx
    - components/admin/bookings-table.tsx
    - components/ui/checkbox.tsx
  modified:
    - components/booking/booking-flow.tsx (dialog wiring)
    - components/layout/admin-shell.tsx (Bookings group)
    - app/admin/page.tsx (Bookings StatCard)

key-decisions:
  - "Task 2 checkpoint verdict: APPROVED — @radix-ui/react-checkbox is the official Radix primitives package (github.com/radix-ui/primitives, ~51.8M weekly downloads, no postinstall script, not deprecated). Install proceeded; generated checkbox.tsx imports the unified radix-ui package already present in package.json — zero new runtime dependencies"
  - "booking-filters is a client component despite the plan's '(server)' label — auto-submit via onChange requires a client handler; PATTERNS.md itself classifies it as client (GET form)"
  - "Conflict handling follows UI-SPEC Interaction 3: destructive Alert with the action's message, then dialog closes + router.refresh() + parent clears the selected slot so the refreshed list shows the new taken state"

patterns-established:
  - "Per-row server-action dialogs in tables: each row owns its useActionState instance (confirm/cancel), so actions are independently pending-safe"
  - "Cancellation toasts carry the deposit suffix as a SINGLE toast: 'Booking cancelled. Deposit refunded.' only when a deposit payment exists (no second toast event)"

requirements-completed: [BOOK-01, BOOK-02, BOOK-03, BOOK-05, BOOK-06, BOOK-07, BOOK-08]

coverage:
  - id: D1
    description: "Public read path — /services listing (3 seed services, mono price·duration, Book this CTA, empty state) + /book rolling 14-day availability calendar with taken-state pills from LEFT JOIN bookings WHERE status <> 'cancelled', ?service= preselect, login-gated slot selection"
    requirement: BOOK-01
    verification:
      - kind: other
        ref: "npx tsc --noEmit + npm run lint (0 errors) + committed 01f93b6"
        status: pass
    human_judgment: false
  - id: D2
    description: "Booking dialog — Radix max-w-md dialog bound to createBooking via useActionState with hidden slotId + deposit checkbox (25% via depositCents); summary rows; success toast + router.push('/booking/{id}'); conflict Alert then close + refresh + clear selection; payment failure Alert stays open"
    requirement: BOOK-03
    verification:
      - kind: other
        ref: "npx tsc --noEmit + npm run test (91 pass) + committed d28da57"
        status: pass
    human_judgment: true
    rationale: "Server action + Neon round trip needs a live session to exercise the atomic claim end-to-end; unit coverage exists at the schema/action surfaces from 02-01. Behavioral confirmation lands in verify-work."
  - id: D3
    description: "Shareable /booking/[id] confirmation — force-dynamic, isUuid -> notFound(), Promise.all booking + mock_emails/mock_sms by booking_id; summary card (Service/Date & time/Price/Deposit 'Paid X' or '—'/Status), Notices section with 'Simulated' honesty note (omitted when zero), owner cancel alert-dialog with requestSubmit intercept + deposit-suffix toast"
    requirement: BOOK-06
    verification:
      - kind: other
        ref: "npx tsc --noEmit + committed d28da57"
        status: pass
    human_judgment: true
    rationale: "Notice rows + cancel flow render from live seeded data; visual walk (2 notice rows, cancelled badge, button disappearance) belongs to verify-work."
  - id: D4
    description: "Admin bookings management — GET searchParams filters (status/service, both default all) in SQL WHERE, ORDER BY slot start ASC, pluralized count line, per-row confirm (pending only) / cancel (pending+confirmed) dialogs with requestSubmit intercept and toasts, EmptyState variants, AdminShell Bookings group + overview StatCard"
    requirement: BOOK-05
    verification:
      - kind: other
        ref: "npx tsc --noEmit + npm run lint (0 errors) + committed 07693cf"
        status: pass
    human_judgment: true
    rationale: "Confirm/cancel mutate live bookings + send notice emails via server actions; browser walk (filter counts, confirm/cancel transitions, slot reopen) lands in verify-work."
  - id: D5
    description: "Deposit flow UI — checkbox default unchecked, checked state in primary, label with formatUsd(depositCents(price)); refund suffix on every cancel path (user + admin) as a single toast"
    requirement: BOOK-08
    verification:
      - kind: other
        ref: "source assertion in booking-dialog.tsx + booking-confirmation.tsx + bookings-table.tsx (committed d28da57, 07693cf)"
        status: pass
    human_judgment: false

# Metrics
duration: 20min
completed: 2026-08-02
status: complete
---

# Phase 2 Plan 2: UI pages — services listing, /book slot calendar flow, booking confirmation, admin bookings management

**Full Phase 2 UI surface wired to the 02-01 data layer: public /services listing with radio-style service cards, the single-page /book flow (service radiogroup → 14-day availability calendar → sticky confirm bar → deposit-toggling confirm dialog with atomic conflict handling), the shareable /booking/[id] confirmation page (summary card, mock email/SMS notices with honesty note, owner cancel), and the /admin/bookings management section (GET filters, soonest-first table, per-row confirm/cancel) — plus the AdminShell Bookings group, overview StatCard, and Services nav item**

## Performance

- **Duration:** 20 min (execution across two runs: Task 1 + Task 2 checkpoint in the initial run, Tasks 3-4 + summary in this continuation)
- **Started:** 2026-08-02T11:13:37Z (Task 1 commit)
- **Completed:** 2026-08-02T11:33:00Z
- **Tasks:** 4 (2 pre-completed in the interrupted run: Task 1 tracer + Task 2 checkpoint approval)
- **Files modified:** 17 (15 created, 2 modified)

## Accomplishments

- **BOOK-03 dialog booking loop:** `booking-dialog` binds `createBooking` via `useActionState` — hidden `slotId` + `deposit` checkbox (25% via `depositCents`), summary rows in `divide-y divide-border`, "Not yet" (secondary) / "Confirm booking" (primary, `Loader2` while pending). Success → toast "Booking confirmed." → `router.push("/booking/{id}")`. Conflict → destructive Alert with the action's message ("That slot was just taken."), then the dialog closes, `router.refresh()`, and `onConflict` clears the parent's selection so the refreshed list shows the taken pill (UI-SPEC Interaction 3). Payment-failure message keeps the dialog open (retryable).
- **BOOK-06/07 shareable confirmation:** `/booking/[id]` is `force-dynamic`, guards `isUuid → notFound()`, and `Promise.all`s the booking row (⋈ slots ⋈ services ⋈ users ⋈ mock_payments) plus `mock_emails`/`mock_sms` by `booking_id`. `BookingConfirmation` renders the summary card (Service / Date & time / Price / Deposit "Paid {amount}" or "—" / Status), the "Notices sent" section with the mono honesty note "Simulated — no real email or SMS was sent." (section omitted when zero notices), and the owner-only cancel action.
- **Owner cancel (Interaction 6):** `canCancel` computed server-side = `isOwner && status in (pending, confirmed) && slot start in future` (slot_date > toDateKey(now) || same-day slot_time > current HH:MM). Cancel goes through an alert-dialog with the Radix `requestSubmit` intercept (the cms-category-table fix) bound to `cancelBooking`; the success toast carries the deposit suffix — "Booking cancelled." / "Booking cancelled. Deposit refunded." — as a single toast, then `router.refresh()` flips the badge to cancelled and removes the button.
- **BOOK-05 admin queue:** `/admin/bookings` re-checks auth, validates GET searchParams (`status` ∈ all/pending/confirmed/cancelled, `service` ∈ all ∪ slugs, anything else → "all"), applies conditional SQL fragments in the WHERE clause, orders by slot start ASC (soonest-first), and runs a twin COUNT for the pluralized "Manage appointments — N bookings · soonest first." line. Per-row dialogs: "Confirm booking" (secondary, pending rows only) via non-destructive dialog; "Cancel booking" (ghost destructive, pending/confirmed rows) via alert-dialog — both per-row `useActionState` with the `requestSubmit` intercept, toasts, and `router.refresh()`. EmptyState variants: "No bookings yet" (no CTA) vs "No bookings match these filters." + "Clear filters" CTA.
- **Shell + overview:** AdminShell gains the Bookings group (CalendarCheck) below Content; `/admin` shows the 6th StatCard (Bookings, CalendarClock) from a bookings COUNT in the existing Promise.all.
- **Task 2 checkpoint verdict recorded:** the [SUS]-flagged `@radix-ui/react-checkbox` install was pre-approved by the user — official Radix primitives package, github.com/radix-ui/primitives, ~51.8M weekly downloads, no postinstall, not deprecated. The generated `components/ui/checkbox.tsx` imports the unified `radix-ui` package that was already a dependency — **zero new runtime dependencies** (plan expected one new package; the unified import makes it free).

## Task Commits

Each task was committed atomically:

1. **Task 1: Public read path — /services + /book availability calendar** - `01f93b6` (feat) — pre-completed in the interrupted run; verified present with 10 files (services/book pages, service-card, slot-picker, booking-flow, nav item)
2. **Task 2: Verify @radix-ui/react-checkbox legitimacy (checkpoint:human-verify, gate blocking-human)** - approved (pre-completed); verdict recorded in this SUMMARY; generated checkbox.tsx committed with Task 3
3. **Task 3: Booking completion — booking-dialog + booking-confirmation + /booking/[id]** - `d28da57` (feat)
4. **Task 4: Admin bookings — filters + table + confirm/cancel + AdminShell group + stat card** - `07693cf` (feat)

**Plan metadata:** `(docs commit — pending below)`

## Files Created/Modified

- `components/booking/booking-dialog.tsx` - Radix max-w-md dialog bound to createBooking (slotId hidden + deposit checkbox), summary rows, conflict/payment Alerts, success toast + push
- `components/booking/booking-confirmation.tsx` - client confirmation body: kicker + badge + description, summary card, Notices section (omitted when zero), owner cancel alert-dialog with requestSubmit intercept
- `app/(main)/booking/[id]/page.tsx` - force-dynamic; isUuid → notFound(); Promise.all booking + emails + sms; server-side canCancel
- `app/(main)/booking/[id]/loading.tsx` - 6-row summary-card skeleton
- `app/(main)/booking/[id]/error.tsx` - error-state + "Try again"
- `app/(main)/booking/[id]/not-found.tsx` - styled 404: "Page not found" + "Back to services" (primary) + "Back to home" (ghost)
- `app/admin/bookings/page.tsx` - GET filters via conditional SQL fragments, soonest-first ORDER BY, twin COUNT, count line, EmptyState variants
- `app/admin/bookings/loading.tsx` - filter-bar (2 selects) + 5 table-row skeletons
- `app/admin/bookings/error.tsx` - error-state + "Try again"
- `components/admin/booking-filters.tsx` - client GET form: Status/Service native selects with Label htmlFor + onChange auto-submit, "Clear filters" ghost link when active
- `components/admin/bookings-table.tsx` - overflow-x-auto min-w-[720px] table; per-row ConfirmBookingDialog + CancelBookingDialog (requestSubmit intercept), badge mapping, hover rows
- `components/ui/checkbox.tsx` - shadcn CLI-generated (official registry; imports unified radix-ui — no new dep)
- `components/booking/booking-flow.tsx` - MODIFIED: wires BookingDialog into the Task 1 confirm-bar placeholder (dialogOpen + onConflict)
- `components/layout/admin-shell.tsx` - MODIFIED: Bookings group (CalendarCheck) below Content
- `app/admin/page.tsx` - MODIFIED: Bookings StatCard (CalendarClock) + bookings COUNT in Promise.all (6 cards)
- *(Task 1, pre-completed):* lib/site.ts Services nav item; app/(main)/services/{page,loading,error}.tsx; app/(main)/book/{page,loading,error}.tsx; components/booking/service-card.tsx, slot-picker.tsx

## Decisions Made

- **booking-filters is a client component** — the plan's action text labels it "(server)" but mandates `onChange → form.submit()` auto-submit, which a server component cannot provide; PATTERNS.md independently classifies it as a client GET-form. Client directive is the only correct reading; the form still performs a plain GET to /admin/bookings (server-rendered results, shareable URL, no client fetch).
- **`onConflict` callback on BookingDialog** — the plan's conflict flow requires clearing the parent's selected slot when the atomic claim fails; a dedicated callback (invoked with the deferred dialog close) keeps that coupling explicit rather than inferring it from onOpenChange (which also fires on "Not yet").
- **Cancel toasts as one toast with suffix** — deposit refund never fires a second toast (UI-SPEC Interaction 8); the suffix is conditionally appended to the single success toast in both user and admin cancel paths.
- **checkbox via unified radix-ui** — the shadcn CLI resolved the checkbox to the already-present `radix-ui` package (the project's unified dependency), so the plan's "only new package" became zero new dependencies; the official-registry artifact is unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] booking-filters cannot be a server component**
- **Found during:** Task 4 (booking-filters)
- **Issue:** The plan's action block says "components/admin/booking-filters.tsx (server)" while simultaneously requiring "auto-submit via onChange → form.submit()" — onChange handlers are impossible in server components. PATTERNS.md classifies the file as client.
- **Fix:** Added `"use client"` — the GET form still targets /admin/bookings with server-rendered results (no client fetch, no behavior change vs. the plan's intent).
- **Files modified:** components/admin/booking-filters.tsx
- **Verification:** tsc + lint pass; form submits via native GET navigation.
- **Committed in:** 07693cf (Task 4 commit)

**2. [Rule 3 - Blocking] checkbox install resolved with zero new dependencies**
- **Found during:** Task 3 (checkbox wiring)
- **Issue:** The plan (Task 2/3) expected package.json to gain `@radix-ui/react-checkbox` (the checkpointed package). The pre-approved CLI run generated checkbox.tsx importing from the project's existing unified `radix-ui` package — no package.json change at all.
- **Fix:** None needed — the official Radix artifact is present and the unified import is already the project-wide convention (AGENTS.md documents `radix-ui` as the wrapped dependency). Kept the generated file untouched per the plan's instruction.
- **Files modified:** components/ui/checkbox.tsx (created), components.json (no change — this shadcn version tracks no component list)
- **Verification:** tsc resolves the import; 91 tests pass.
- **Committed in:** d28da57 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking, both resolved within the plan's intent)
**Impact on plan:** No scope creep. Both are plan-text inconsistencies (server-vs-client classification; expected-vs-actual package resolution) that the plan's own behavioral requirements and PATTERNS.md resolve.

## Issues Encountered

- None during Tasks 3-4. The prior interrupted run (Windows stdio hang) had already completed Task 1 and the Task 2 checkpoint approval; this continuation executed Tasks 3-4 from the plan without further incident.

## User Setup Required

None - no external service configuration required. `.env.local` (already present) covers all 9 env vars; the seeded demo user (demo@example.com) and 4 sample bookings power the admin flows.

## Next Phase Readiness

- All four route groups render with loading/error/empty states; the 11 covered UI Considerations have working implementations (zero-slot day omission, notice-section omission, guest shareable view, filter pluralization, overflow truncation, keyboard radiogroup/pills, GET-form a11y).
- Browser walk (human-check lists from Tasks 1/3/4) and the 2 backstop audits (4.5:1 contrast in .dark; slot pill states distinguishable without color) remain for verify-work — the automated battery (tsc, lint, 91 tests) passes.
- proxy.ts untouched (matcher already covers /admin; /services, /book, /booking are public by construction); no new env vars; zero new runtime dependencies.

---

*Phase: 02-booking-app*
*Completed: 2026-08-02*

## Self-Check: PASSED

- All 13 plan-created files exist on disk (12 source files + this SUMMARY).
- All 3 plan commits exist in git log: `01f93b6` (Task 1, pre-completed), `d28da57` (Task 3), `07693cf` (Task 4).
- Verification battery (final run): 91 tests / 7 files pass, `npx tsc --noEmit` clean, `npm run lint` 0 errors (11 pre-existing warnings — the shared `_error` unused-var pattern in every error.tsx, same as blog/error.tsx).
- STATE.md advanced to plan 2 of 2 (100% progress); ROADMAP updated; BOOK-01/02/03/05/06/07/08 marked complete.
