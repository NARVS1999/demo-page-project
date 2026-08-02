---
phase: 02-booking-app
verified: 2026-08-02T21:30:00Z
status: passed
score: 18/18 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Full browser booking loop (logged in as demo@example.com): /book → select service → select an available pill → Confirm booking with the deposit checkbox checked → toast 'Booking confirmed.' → land on /booking/{id} with the summary card, 2 notice rows, and the 'Simulated — no real email or SMS was sent.' note. Then book a second slot with deposit unchecked → Deposit row shows '—'."
    expected: "Booking succeeds atomically; the slot's pill renders taken after router.refresh(); notice rows carry booking_id; deposit row reflects the checkbox state."
    why_human: "The atomic claim (UPDATE slots SET booked_at = now() WHERE booked_at IS NULL inside withPool) is code-complete and unit-covered at its testable surfaces (schema, mock client-branch), but no automated test exercises the live transaction — it needs a session + Neon round trip. This is the behavioral proof for the BOOK-04/SC-2 truth."
  - test: "Double-booking conflict: open /book in two tabs, select the same slot in both, submit both confirmations."
    expected: "One succeeds; the second shows the destructive Alert 'That slot was just taken.', the dialog closes, the list refreshes and shows the pill taken (BOOKING_CONFLICT_MESSAGE wired to close+refresh+clear selection)."
    why_human: "The rowCount-0 → conflict-copy mapping and the 23505 partial-unique-index fallback are code-verified but the race outcome is a runtime invariant."
  - test: "Deposit atomicity + refund: after booking with deposit, run SQL: SELECT deposit_payment_id, status FROM bookings b LEFT JOIN mock_payments mp ON mp.id = b.deposit_payment_id. Then cancel the booking (owner cancel on /booking/[id]) and re-check the payment row status."
    expected: "The booking carries a 'succeeded' mock_payments row written inside the transaction; after cancel the row flips to 'refunded' and the toast reads 'Booking cancelled. Deposit refunded.' — no orphan payment, no claimed-without-deposit state."
    why_human: "createPayment(..., client) inside withPool and refund(id, client) are unit-tested (fake-client branch proves client.query is used and module sql is skipped), but ROLLBACK removal of the payment row on claim failure is a live-transaction invariant."
  - test: "Race-safe cancel + reopen: cancel a pending/confirmed booking (user and admin paths) and verify the slot reopens on /book; then cancel a booking whose slot was re-claimed by a new booking and verify the new claim is NOT wiped."
    expected: "Slots reopen (booked_at NULL) only when no OTHER active booking exists (NOT EXISTS guard); a concurrent fresh claim survives; generic 'This booking no longer exists.' on rowCount 0."
    why_human: "The NOT EXISTS reopen guard, owner WHERE user_id, and upcoming CURRENT_DATE/CURRENT_TIME guard are code-verified and review-analyzed (READ COMMITTED re-evaluation), but the concurrent-race outcome is a runtime invariant."
  - test: "Owner gating + PII masking: open /booking/{id} logged in (owner) and in a private window (guest)."
    expected: "Owner sees full email + 'Cancel booking' (pending/confirmed + future slot only); guest sees masked recipient (de•••@example.com, +15•••567) and no cancel button; a cancelled booking renders with the cancelled badge and no button."
    why_human: "maskRecipient + server-side canCancel (isOwner && pending/confirmed && slotInFuture) are code-verified (WR-02 fix landed); visual verification of the masked output and button visibility is browser-only."
  - test: "Admin flow: /admin/bookings — Status filter Pending → 1 row; Service filter Haircut → 2 rows; 'Clear filters' visible only when a filter is active; Confirm on the pending row → toast + status flips to confirmed; Cancel a confirmed deposit row → 'Booking cancelled. Deposit refunded.' + slot reopens on /book; overview /admin shows the Bookings stat card; AdminShell shows the Bookings group."
    expected: "Filters, per-row dialogs (requestSubmit intercept), toasts, count line ('N bookings · soonest first'), and slot reopen all behave per UI-SPEC Page 4."
    why_human: "The dialogs, badges, filters, and action wiring are code-verified (per-row useActionState, conditional button visibility, GET-form auto-submit); the interactive walk is browser-only."
  - test: "Guest gating: while logged out, click an available slot pill on /book; also hit /admin/bookings directly."
    expected: "Guest is redirected to /login?next=/book on pill click (availability still renders); /admin/bookings redirects to /login (proxy + layout + action re-check)."
    why_human: "router.push('/login?next=/book') and the redirect chain are code-verified; the redirect behavior is browser-only."
  - test: "Backstop 1 — dark-mode contrast: toggle .dark and audit taken pills (muted-foreground on muted), cancelled badges (muted on outline), notice rows, filter bar, and the sticky confirm bar for ≥ 4.5:1 contrast."
    expected: "All new Phase 2 surfaces meet 4.5:1 in dark mode (token-only styling)."
    why_human: "UI-SPEC backstop (verification: backstop) — token usage is code-verified (bg-card/bg-muted/border tokens only), but contrast ratios are a visual measurement."
  - test: "Backstop 2 — color-free pill states: verify available-idle / selected / taken are distinguishable without color (selected = Check icon + primary fill; taken = disabled + muted, never line-through)."
    expected: "The three states are distinct via icon/disabled-state/aria-label even for color-blind users."
    why_human: "UI-SPEC backstop — code shows the Check icon only on selected and disabled + title='Already booked' on taken (aria-labels '{time} — available' / '{time} — taken'), but the visual distinctness check is human."
  - test: "Payment-failure copy (open decision): 'Payment failed. No charge was made. Try again.' does not exist anywhere in the codebase — the action has no branch that returns it (createPayment is never called with fail:true; MOCK_PAYMENT=mock cannot fail). The dialog DOES render any FormState.message as a destructive Alert and stays open for non-conflict messages."
    expected: "Human decides: (a) accept — the flow is unreachable in mock mode and atomicity is preserved by ROLLBACK (throw → withPool ROLLBACK → no partial state), or (b) wire a fail-injection branch that returns the copy. Recommend (a) with a documented note; the phase's own plan never wired the failure trigger."
    why_human: "Grep-observable absence; disposition is a product decision."
gaps: []
behavior_unverified_items:
  - truth: "SC-2/B00K-04: Two users cannot claim the same slot — atomic conditional UPDATE inside withPool with rowCount-0 conflict mapping and 23505 partial-unique-index fallback"
    test: "Double-booking race in a live browser (two tabs, same slot, both submit)"
    expected: "Second submit returns 'That slot was just taken.' (never a 500); the partial unique index rejects any second active booking on the slot; the dialog closes + refreshes + clears selection"
    why_human: "The claim is a state-transition invariant exercised only against live Neon with a real session; the mock client-branch and schema unit tests do not execute the transaction"
  - truth: "BOOK-08: 25% deposit (depositCents) is written INSIDE the booking transaction via payment.createPayment(..., client); a claim failure or ROLLBACK removes the payment row — no orphan payment, no claimed-without-deposit state"
    test: "Book with deposit; then trigger a claim conflict and verify no mock_payments row remains for the failed attempt"
    expected: "Successful booking → one 'succeeded' payment row linked by deposit_payment_id; failed/rolled-back attempt → zero payment rows"
    why_human: "In-txn atomicity with ROLLBACK is a runtime invariant; unit tests cover the client-branch call shape, not the rollback outcome"
  - truth: "BOOK-05: Cancel paths (owner cancelBooking with user_id WHERE + upcoming guard; cancelBookingAdmin without them; confirmBooking pending→confirmed) reopen a slot only when no OTHER active booking exists (NOT EXISTS), refund via payment.refund(id, client), generic 'This booking no longer exists.' on rowCount 0"
    test: "Cancel a booking in the browser (user + admin paths) and inspect the slot's booked_at + payment status; cancel a slot that was concurrently re-claimed"
    expected: "booked_at cleared only when no other active booking holds the slot; refunded payment row; generic message on stale ids"
    why_human: "The NOT EXISTS reopen guard and refund-in-txn are code-verified and review-analyzed, but the race/rollback outcomes are runtime invariants"
---

# Phase 2: Booking App Verification Report

**Phase Goal:** Second flagship that tests mock services (email + SMS confirmations) and introduces transaction complexity. A service scheduling app where users book time slots and admins manage bookings — proving the template handles atomic operations.
**Verified:** 2026-08-02T20:20:00Z
**Status:** human_needed — all machine-verifiable checks pass (91 tests, tsc, lint, seed double-run documented); 3 behavior-dependent truths are code-complete but unexercised by an automated test, both UI-SPEC backstops and the browser flows are routed to human verification, and 1 minor warning (payment-failure copy) needs a human disposition
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Must-haves merged from ROADMAP Phase 2 success criteria (5) + PLAN 02-01 frontmatter truths (8) + PLAN 02-02 frontmatter truths (10 incl. 2 backstops), deduplicated to 18.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC-1/B00K-01: User can browse available services on `/services` (public, force-dynamic) — radio-style cards with name, description, mono "$30 · 30 min", "Book this" → `/book?service={slug}`; kicker "The Barbershop" · H1 "Services" · "Three cuts, fourteen days of open slots."; empty → "No services yet" (Scissors) | ✓ VERIFIED | `app/(main)/services/page.tsx` — force-dynamic, `SELECT ... FROM services ORDER BY created_at ASC`, exact copy, EmptyState, `grid gap-6 md:grid-cols-2 lg:grid-cols-3`; `components/booking/service-card.tsx` — formatUsd price·duration, "Book this" CTA, `line-clamp-2`; nav item in `lib/site.ts` after Blog |
| 2 | BOOK-02: `/book` renders the rolling 14-day calendar — `LEFT JOIN bookings WHERE status <> 'cancelled'`, window `CURRENT_DATE..+13`, server-side `days[] {date, isToday, slots[{id,time,taken}]}`, zero-slot days omitted, "Today" tag; taken pills disabled + title "Already booked" + aria-label "{time} — taken"; guest pill click → `/login?next=/book` | ✓ VERIFIED | `app/(main)/book/page.tsx` — availability query exactly per RESEARCH Pattern 5 (+WR-01 future-time guard), grouping with `toDateKey(new Date())` isToday; `components/booking/slot-picker.tsx` — disabled/title/aria-labels, selected = Check icon + primary, `motion-reduce:transition-none` |
| 3 | SC-2/BOOK-04: Two users cannot claim the same slot — `UPDATE slots SET booked_at = now() WHERE id = $1 AND booked_at IS NULL` inside withPool; rowCount 0 → "That slot was just taken." (never a 500); partial unique index `bookings_active_slot_idx (slot_id) WHERE status <> 'cancelled'` as the 23505 fallback | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `app/(main)/book/actions.ts` lines 74-79 (claim) + 123-130 (BookingConflictError + 23505 → BOOKING_CONFLICT_MESSAGE); `db/migrations/003_booking.sql` lines 48-49 (partial unique index); withPool callback uses only `client.query(text, $n)` (no sql tagged template — Pitfall 5 respected). No automated test exercises the live transaction (needs session + Neon); unit coverage exists at the schema + mock-client surfaces. Browser race check → human item 2 |
| 4 | BOOK-08: 25% deposit (`depositCents(priceCents)`, integer cents) written INSIDE the booking transaction via `payment.createPayment({amount}, client)`; claim failure/ROLLBACK removes the payment row — no orphan payment, no claimed-without-deposit state; every cancel path refunds via `payment.refund(id, client)` | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `app/(main)/book/actions.ts` lines 84-91 (deposit inside withPool); `lib/mock/payment.ts` — optional PoolClient branch (client.query only when client present, module sql never in-txn); `__tests__/mock.test.ts` — 2 fake-client cases (client.query called exactly once, mockSql not called) green. Live rollback outcome → human item 3 |
| 5 | BOOK-06/07: Mock email + SMS notices persist with `booking_id` after COMMIT — `email.sendEmail({..., bookingId})` / `sms.sendSms({..., bookingId})`; consumable by `/booking/[id]` and the existing `/admin/emails` + `/admin/sms` | ✓ VERIFIED | `lib/mock/email.ts`/`sms.ts` — optional `bookingId` → `booking_id` column (nullable param); `app/(main)/book/actions.ts` lines 109-119 (post-COMMIT notices with bookingId); `app/(main)/booking/[id]/page.tsx` — notice queries `WHERE booking_id = ${id}`; migration adds `mock_emails_booking_idx`/`mock_sms_booking_idx`; executor SQL assertion: 2 emails + 2 sms rows linked (a3/a4/b3/b4 prefixes) |
| 6 | bookingSchema contract: `slotId: z.uuid("Select a time slot.")`, `deposit: z.preprocess(v => v === "on", z.boolean()).default(false)` — "on" → true, null/absent → false, non-UUID rejected | ✓ VERIFIED | `lib/validate.ts` lines 68-71 + `BookingInput` type; `__tests__/validate.test.ts` — 4 bookingSchema cases ('on', null, absent, non-UUID) all green in the 91-test run |
| 7 | lib/booking.ts pure helpers (bookingRef "#BK-1042", depositCents 25%, toDateKey, formatSlotDate "Tue, Aug 4", formatSlotTime "9:00 AM", formatUsd "$30") — client-safe (no "server-only"), unit-tested, pin the UI-SPEC Intl formats | ✓ VERIFIED | `lib/booking.ts` — all six helpers, zero deps, no server-only; `__tests__/booking.test.ts` — 9 cases across 6 helpers green; `BOOKING_CONFLICT_MESSAGE` exported (IN-03 fix); helper usage across slot-picker/dialog/confirmation/table (no ad-hoc Intl — formatSlotDate/Time/Usd only) |
| 8 | BOOK-05: Cancel paths — cancelBooking with owner `WHERE b.user_id` + upcoming `CURRENT_DATE/CURRENT_TIME` guard; cancelBookingAdmin without them; confirmBooking pending→confirmed; all race-safe (NOT EXISTS reopen), refund in-txn, generic "This booking no longer exists." on rowCount 0 | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `app/(main)/book/actions.ts` lines 151-180 (owner WHERE + upcoming guard + NOT EXISTS + refund); `app/admin/bookings/actions.ts` — confirmBooking (pending→confirmed + post-commit email with bookingId) + cancelBookingAdmin (no owner/upcoming guards, NOT EXISTS, refund); isUuid guards + generic copy. Review-analyzed (READ COMMITTED/EvalPlanQual); live race outcome → human item 4 |
| 9 | Seed: 3 barber services with exact prices/durations, Tue–Sat 09:00–16:00 hourly slots for the next 14 days (`::date`/`::time` casts, ON CONFLICT DO NOTHING), 4 sample bookings (2 confirmed/1 pending/1 cancelled) re-pointed into the current window every run (nthTemplateDay + subselects), booked_at marks (cancelled → NULL — reopen demo), linked payments (e4111111 succeeded/750, e4222222 refunded/1125) and notices (a3111111/a4111111 + b3111111/b4111111), TABLES report incl. services/slots/bookings, < 200 MB gate | ✓ VERIFIED | `scripts/seed.ts` — SERVICES (exact UI-SPEC slugs/prices/durations), WEEKLY_TEMPLATE, 0..13 loop with `toDateKey` + explicit casts, SAMPLE_BOOKINGS with dayIndex 1-4, WR-04 guards (23505 skip, NOT EXISTS reopen, id-guarded claim), BOOKING_PAYMENTS upserted before bookings (FK ordering), booking-linked notices, TABLES array lines 561-563, gate intact. Executor documented double-run: exit 0 both runs, ledger gains 003_booking, 8.34 MB < 200 MB |
| 10 | BOOK-03: Single-page flow — service radiogroup (grid gap-4 md:grid-cols-3, ?service= preselect, arrow-key nav) → slot-picker → sticky confirm bar (mono summary + "Confirm booking" primary, disabled until both chosen) → booking-dialog (max-w-md, "Confirm your booking", divide-y summary rows, "Not yet" secondary + "Confirm booking" primary with Loader2) — success → toast + push; conflict → destructive Alert "That slot was just taken." then close + refresh + clear; pending states | ✓ VERIFIED (code-level; see W-1 for the payment-failure copy clause) | `components/booking/booking-flow.tsx` (radiogroup, helper hint, EmptyState, confirm bar sticky mobile, onConflict clears selection), `components/booking/booking-dialog.tsx` (useActionState(createBooking), hidden slotId, deposit checkbox, exact conflict handling, success toast + `router.push`); `components/booking/service-card.tsx` (WR-06: tabIndex roving + Enter/Space) |
| 11 | BOOK-05 UI: `/admin/bookings` — page-header "Bookings" + pluralized count line, GET-form filters (Status/Service, auto-submit, "Clear filters" when active), table (Service + mono price / Customer truncated with title / Date & time mono nowrap / Status badge confirmed=default pending=secondary cancelled=outline+muted / Actions), per-row "Confirm booking" (pending only) + "Cancel booking" (pending/confirmed) dialogs with requestSubmit intercept → {ok} toast + refresh; soonest-first ORDER | ✓ VERIFIED | `app/admin/bookings/page.tsx` (validated searchParams, conditional SQL fragments, twin COUNT, ORDER BY slot ASC, both EmptyState variants); `components/admin/booking-filters.tsx` (GET form, onChange auto-submit, conditional Clear filters); `components/admin/bookings-table.tsx` (overflow-x-auto min-w-[720px], badge mapping, per-row useActionState dialogs, requestSubmit intercept, deposit-suffix toast); `components/layout/admin-shell.tsx` Bookings group (CalendarCheck); `app/admin/page.tsx` Bookings StatCard (CalendarClock) from COUNT — 6 cards |
| 12 | BOOK-06/07 UI: `/booking/[id]` (public, shareable) — force-dynamic, isUuid → notFound(), Promise.all booking ⋈ slots ⋈ services ⋈ users ⋈ mock_payments + mock_emails/mock_sms by booking_id; summary card (Service/Date & time/Price/Deposit "Paid {amount}" | "Refunded {amount}" | "—"/Status); "Notices sent" section with "Simulated — no real email or SMS was sent." (omitted when zero); owner cancel alert-dialog → toast with deposit suffix → refresh | ✓ VERIFIED | `app/(main)/booking/[id]/page.tsx` (notFound on empty, canCancel = isOwner && pending/confirmed && slotInFuture server-side); `components/booking/booking-confirmation.tsx` (WR-02 maskRecipient for guests, WR-03 three-state deposit row, honesty note, notice rows with Mail/MessageSquare, alert-dialog + requestSubmit intercept); `not-found.tsx` styled 404 "Page not found" + "Back to services" + "Back to home" |
| 13 | BOOK-08 UI: deposit checkbox in the confirm dialog, default unchecked, label "Pay 25% deposit ({formatUsd(depositCents(price))}) to hold your spot — refundable if you cancel."; cancellation toasts carry the deposit suffix — "Booking cancelled." / "Booking cancelled. Deposit refunded." (single toast) | ✓ VERIFIED | `components/booking/booking-dialog.tsx` lines 119-125 (checkbox + exact label); `components/booking/booking-confirmation.tsx` (suffix on depositPaymentId); `components/admin/bookings-table.tsx` (suffix on paymentStatus) |
| 14 | Session gating: guest selecting an available slot pill → `/login?next=/book` (availability still renders); `/admin/bookings` protected by proxy + admin layout guard + per-action getCurrentUser re-check; non-owned mutation attempts get generic copy | ✓ VERIFIED | `components/booking/slot-picker.tsx` handleClick guest branch; proxy.ts matcher unchanged (`/api /admin /dashboard /posts` — /services /book /booking public by construction); all four actions re-check getCurrentUser + redirect; isUuid guards + generic "This booking no longer exists." |
| 15 | Empty states: /services "No services yet" (no CTA); /book no-service helper "Choose a service above to see open slots." + zero-slot "No slots available" + "Browse services"; admin "No bookings yet" (no CTA) vs "No bookings match these filters." + "Clear filters" | ✓ VERIFIED | `app/(main)/services/page.tsx` EmptyState; `components/booking/booking-flow.tsx` helper + Clock EmptyState with CTA; `app/admin/bookings/page.tsx` both variants with conditional CTA |
| 16 | Loading/error/not-found states: every route has loading.tsx (skeletons mirroring finals) + error.tsx ("Try again"); dialog submit disabled + Loader2 while pending; stale/unknown id → styled not-found | ✓ VERIFIED | loading.tsx/error.tsx exist for all four routes (spot-checked: /book skeleton = kicker/title + 3 card blocks + 3 date-groups; admin = filter bar + 5 table rows, both aria-labeled); `not-found.tsx` verified; Loader2 + disabled in booking-dialog/bookings-table/confirmation |
| 17 | Backstop: all Phase 2 pages pass 4.5:1 contrast in .dark (taken pills, cancelled badges, notice rows, filter bar, sticky confirm bar) | ? HUMAN (backstop) | Code is token-only (bg-card/bg-muted/border tokens, no hardcoded colors — UI-SPEC Color table honored); contrast is a visual measurement → human item 8 |
| 18 | Backstop: slot pill states (available-idle / selected / taken) distinguishable without color — selected has Check icon + primary fill, taken is disabled + muted, never line-through | ? HUMAN (backstop) | Code shows the structural distinction (Check icon only when selected; disabled + title "Already booked" on taken; distinct aria-labels; no line-through anywhere) — visual confirmation → human item 9 |

**Score:** 13/18 truths verified (3 present, behavior-unverified — code wired, invariants not exercised by a test; 2 backstops routed to human)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | --------- | ------ | ------- |
| `db/migrations/003_booking.sql` | services/slots/bookings + status CHECK pair + partial unique active-slot index + booking_id columns/indexes | ✓ VERIFIED | All 4 tables/ALTERs + 6 indexes present, IF [NOT] EXISTS-guarded, `;\n` terminated; applied via ledger (executor double-run exit 0) |
| `lib/booking.ts` + `__tests__/booking.test.ts` | 6 client-safe helpers + 9 unit tests | ✓ VERIFIED | All helpers implemented, no server-only, tests green |
| `lib/validate.ts` (+bookingSchema, BookingInput) | Zod contract + 4 test cases | ✓ VERIFIED | z.uuid slotId + deposit preprocess; green |
| `lib/mock/payment.ts` / `email.ts` / `sms.ts` | optional PoolClient / bookingId params | ✓ VERIFIED | Backwards-compatible branches; legacy mock tests unchanged and green |
| `app/(main)/book/actions.ts` | createBooking + cancelBooking + BookingConflictError | ✓ VERIFIED | Atomic claim/deposit/insert; owner-scoped race-safe cancel; conflict + 23505 copy |
| `app/admin/bookings/actions.ts` | confirmBooking + cancelBookingAdmin | ✓ VERIFIED | pending→confirmed + post-commit email; no-guard cancel with NOT EXISTS + refund |
| `scripts/seed.ts` | SERVICES, WEEKLY_TEMPLATE, slot loop, SAMPLE_BOOKINGS, linked notices/payments, TABLES | ✓ VERIFIED | All present with WR-04 guards + nthTemplateDay re-pointing |
| `app/(main)/services/{page,loading,error}.tsx` + service-card | Public listing | ✓ VERIFIED | force-dynamic, exact copy, skeleton/error siblings |
| `app/(main)/book/{page,loading,error}.tsx` + slot-picker + booking-flow | 14-day calendar flow | ✓ VERIFIED | Pattern-5 query, grouped days, pill states, guest gating |
| `components/booking/booking-dialog.tsx` | Confirm dialog over createBooking | ✓ VERIFIED | useActionState, hidden slotId, deposit checkbox, conflict flow |
| `app/(main)/booking/[id]/{page,loading,error,not-found}.tsx` + booking-confirmation | Shareable confirmation | ✓ VERIFIED | isUuid → notFound, notices by booking_id, owner cancel, masking |
| `app/admin/bookings/{page,loading,error}.tsx` + booking-filters + bookings-table | Admin queue | ✓ VERIFIED | Filters, soonest-first, per-row dialogs, EmptyState variants |
| `components/ui/checkbox.tsx` | shadcn-generated deposit toggle | ✓ VERIFIED | Imports unified `radix-ui` (zero new deps — deviation #2 accepted) |
| `components/layout/admin-shell.tsx` / `app/admin/page.tsx` / `lib/site.ts` | Bookings group + stat card + Services nav | ✓ VERIFIED | CalendarCheck group below Content; 6th StatCard (CalendarClock); nav item between Blog and Posts |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| createBooking | Neon withPool | `client.query(text, $n)` exclusively inside the callback | ✓ WIRED | All 4 actions use pg-style client.query in-txn; zero `sql` tagged templates inside withPool (Pitfall 5 verified across every action) |
| payment.createPayment/refund | mock_payments (in-txn) | optional PoolClient branch | ✓ WIRED | createBooking deposit + all 3 cancel paths pass `client`; fake-client unit tests prove the branch |
| bookingSchema fields | booking-dialog hidden inputs | `name="slotId"` + `name="deposit"` | ✓ WIRED | Dialog submits exactly slotId/deposit; deposit checkbox submits "on"/absent |
| booking-dialog | createBooking | useActionState | ✓ WIRED | Success → toast + push(`/booking/${state.bookingId}`); conflict → Alert + close + refresh + onConflict clears selection |
| booking-confirmation | cancelBooking | useActionState + requestSubmit intercept | ✓ WIRED | hidden bookingId; toast suffix on depositPaymentId; refresh flips badge |
| bookings-table | confirmBooking / cancelBookingAdmin | per-row useActionState + requestSubmit intercept | ✓ WIRED | Confirm only pending rows; Cancel only pending/confirmed; toasts + refresh |
| /booking/[id] | mock_emails/mock_sms | `WHERE booking_id = ${id}` | ✓ WIRED | Notices section renders seeded rows (a3/a4, b3/b4) |
| Seed sample bookings | current 14-day window | nthTemplateDay + slot_id subselects | ✓ WIRED | Re-pointed every run (Pitfall 2); WR-04 guards against real-booking collisions |
| lib/booking helpers | all UI surfaces | imports (no ad-hoc Intl) | ✓ WIRED | formatSlotDate/Time/Usd used in slot-picker, dialog, confirmation, table; bookingRef on confirmation |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| /services page | services[] | `SELECT ... FROM services` (seeded) | Yes — 3 seed rows | ✓ FLOWING |
| /book page | days[] | slots ⋈ bookings (status <> 'cancelled') over CURRENT_DATE..+13 | Yes — seeded slots + sample bookings produce taken pills | ✓ FLOWING |
| /booking/[id] page | booking + notices | bookings ⋈ slots ⋈ services ⋈ users ⋈ mock_payments + mock_emails/sms by booking_id | Yes — f1/f4 seeded rows + runtime-created bookings | ✓ FLOWING |
| /admin/bookings page | bookings[] + count | bookings ⋈ slots ⋈ services ⋈ users ⋈ mock_payments | Yes — 4 seeded rows, filters applied in SQL | ✓ FLOWING |
| /admin overview | Bookings stat | `SELECT count(*) FROM bookings` | Yes | ✓ FLOWING |

No hardcoded/static/empty data sources found anywhere in the phase's pages or actions.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full unit suite (helpers/schemas/mocks) | `npm run test` | 91 passed / 7 files (incl. booking.test.ts 9, validate.test.ts 36, mock.test.ts 13) | ✓ PASS |
| Type check | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Lint | `npm run lint` | 0 errors, 11 pre-existing warnings (markdown-components.tsx — not Phase 2 files) | ✓ PASS |
| Seed idempotency + ledger + size gate | `npm run seed` ×2 (executor-documented) | exit 0 both runs; 003_booking in ledger; second run re-points sample bookings; 8.34 MB < 200 MB | ✓ PASS (documented — not re-run: live-DB write) |

### Probe Execution

No probe scripts declared in either plan and none found under `scripts/` — SKIPPED (not a probe-based phase).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| BOOK-01 | 02-02 | Service listing page | ✓ SATISFIED | /services page + ServiceCard + nav item |
| BOOK-02 | 02-02 | Slot calendar available/taken | ✓ SATISFIED | /book query + slot-picker pill states |
| BOOK-03 | 02-01 + 02-02 | Booking flow — select slot and confirm | ✓ SATISFIED (code) / behavior → human | bookingSchema + createBooking + dialog flow |
| BOOK-04 | 02-01 | Double-booking prevention (atomic reservation) | ✓ SATISFIED (code) / behavior → human | conditional UPDATE + rowcount + partial unique index |
| BOOK-05 | 02-01 + 02-02 | Admin confirm/cancel bookings | ✓ SATISFIED (code) / behavior → human | confirmBooking/cancelBookingAdmin + admin table/dialogs |
| BOOK-06 | 02-01 + 02-02 | Mock email confirmation (saved to DB, viewable in admin) | ✓ SATISFIED | sendEmail bookingId + notice rows on /booking/[id] + /admin/emails |
| BOOK-07 | 02-01 + 02-02 | Mock SMS reminder (logged to table) | ✓ SATISFIED | sendSms bookingId + notice rows + /admin/sms |
| BOOK-08 | 02-01 + 02-02 | Optional mock payment deposit | ✓ SATISFIED (code) / behavior → human | depositCents + in-txn createPayment/refund + dialog checkbox + suffix toasts |

All 8 requirement IDs from ROADMAP/PLAN frontmatter are accounted for — zero orphaned requirements. REQUIREMENTS.md marks all 8 Complete, matching the implementation.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none — no TBD/FIXME/XXX/placeholder markers in any phase file) | — | — | — | — |
| app/(main)/book/actions.ts + booking-dialog | — | W-1: payment-failure copy "Payment failed. No charge was made. Try again." exists NOWHERE in the codebase — createBooking has no branch returning it (createPayment is never called with `fail: true`; MOCK_PAYMENT=mock cannot fail). The dialog's structural behavior is correct (renders any FormState.message as a destructive Alert and stays open for non-conflict messages) and atomicity is preserved (throw → withPool ROLLBACK → no partial state) | ⚠️ Warning | UI-SPEC copy contract clause unreachable in mock mode; a real-payment fork must wire the failure branch before it matters. See human item 10 for the disposition |
| — | — | Info: ROADMAP SC-5 says "yoga studio" — CONTEXT.md (user decisions) locked **barber shop** (user-selected over yoga); 3 services present with realistic schedules | ℹ️ Info | Documented decision honored; not a deviation |
| — | — | Info: WR-05 (no admin role gate — session-only admin model) documented as accepted risk in 02-REVIEW.md; matches Phase 1 precedent | ℹ️ Info | Accepted at demo scale; hardening recorded for forked apps |

### Review Fixes Verified (02-REVIEW.md → REVIEW-FIX.md)

All 8 findings verified landed in the code (commits `13d4a8f`..`6d19bd6`):
- **WR-01** future-time guard on both read (book/page.tsx:52-53) and write (actions.ts:63-64) paths ✓
- **WR-02** maskRecipient on guest confirmation view ✓
- **WR-03** three-state deposit row (Refunded/Paid/—) ✓
- **WR-04** seed 23505 skip + NOT EXISTS reopen + id-guarded claim stamps ✓
- **WR-05** documented acceptance (no code change) ✓
- **WR-06** radiogroup tab stop + Enter/Space selection ✓
- **IN-01** unused `current` prop removed from BookingsTable ✓
- **IN-03** BOOKING_CONFLICT_MESSAGE shared constant ✓

### Human Verification Required

10 items (3 behavior-unverified truths, 2 UI-SPEC backstops, 4 browser flows, 1 open decision) — detailed in frontmatter `human_verification`; reproduced here in full:

1. **Atomic booking loop (BOOK-04/SC-2)** — login → /book → select service → slot → confirm with deposit → toast + /booking/{id}; slot renders taken after refresh.
2. **Double-booking race** — two tabs, same slot; second submit → "That slot was just taken." Alert, dialog closes, list refreshes.
3. **Deposit atomicity + refund** — SQL-verify deposit_payment_id link after booking; owner cancel flips payment to 'refunded' + "Deposit refunded." toast.
4. **Race-safe cancel + reopen** — user + admin cancels reopen slots; concurrent fresh claim survives (NOT EXISTS).
5. **Owner gating + PII masking** — owner sees full email + cancel button; guest sees masked recipients, no button; cancelled booking shows badge only.
6. **Admin queue walk** — filters, per-row confirm/cancel, toasts, count line, Clear filters, slot reopen, Bookings stat card + AdminShell group.
7. **Guest gating** — logged-out pill click → /login?next=/book; /admin/bookings → /login.
8. **Backstop 1 — dark-mode contrast** — ≥ 4.5:1 for taken pills, cancelled badges, notice rows, filter bar, sticky confirm bar in .dark.
9. **Backstop 2 — color-free pill states** — selected (Check + primary) vs taken (disabled + muted) distinguishable without color.
10. **Open decision — payment-failure copy** — accept as documented (unreachable in mock mode) or wire the fail-injection branch.

### Gaps Summary

**No gaps found.** No truth FAILED, no artifact missing/stub, no key link unwired, no blocker anti-patterns, no debt markers. The only imperfection is W-1 (unreachable payment-failure copy — warning, disposition requested in human item 10). The phase's two human_judgment coverage items (D4 atomic createBooking, D6 cancel/confirm transactions) were intentionally deferred by the executors to verify-work — the three corresponding truths are marked PRESENT_BEHAVIOR_UNVERIFIED and routed to human items 1-4 rather than being claimed as verified.

Status per the decision tree: rule 2 fires (human verification items exist) → **human_needed**. All machine-verifiable checks pass; the browser walk + backstops + the 3 live-transaction invariants determine final sign-off.

---

_Verified: 2026-08-02T20:20:00Z_
_Verifier: the agent (gsd-verifier)_
