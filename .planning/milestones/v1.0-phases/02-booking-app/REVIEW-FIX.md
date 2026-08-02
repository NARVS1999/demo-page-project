---
phase: 02-booking-app
fixed_at: 2026-08-02T20:10:00Z
review_path: .planning/phases/02-booking-app/02-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 2: Code Review Fix Report

**Fixed at:** 2026-08-02T20:10:00Z
**Source review:** `.planning/phases/02-booking-app/02-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (6 warnings + 2 trivial info items)
- Fixed: 8
- Skipped: 0

## Fixed Issues

### WR-01: Past-time slots are bookable — write path has no future-time guard

**Files modified:** `app/(main)/book/page.tsx`, `app/(main)/book/actions.ts`
**Commit:** `13d4a8f`
**Applied fix:** Added the cancel-path future-time guard to both ends of the write path. The `/book` availability query now filters with `AND (s.slot_date > CURRENT_DATE OR (s.slot_date = CURRENT_DATE AND s.slot_time > CURRENT_TIME))`, and `createBooking`'s slot snapshot SELECT has the identical guard — a stale/past slot resolves to `rowCount 0` → `BookingConflictError` → the UI-SPEC conflict copy ("That slot was just taken."), never a 500. Since the server only returns future slots, the client slot-picker needs no change (defense-in-depth unnecessary — it renders only server-filtered slots). Closes the TOCTOU mismatch: a booking that could never be self-cancelled can no longer be created.

### WR-02: Customer email + notice recipients are PII rendered on a public page

**Files modified:** `components/booking/booking-confirmation.tsx`
**Commit:** `680f774`
**Applied fix:** Cheap fix applied instead of the locked-decision acceptance: guests (shareable link) now see the owner's email and every notice recipient **masked** (`de•••@example.com`, `+15•••567` via a new `maskRecipient` helper); the owner sees them in full. The locked shareable confirmation layout is untouched — only PII is hidden from anonymous visitors. Residual acceptance per CONTEXT lock: notice *bodies* (demo copy, "Hi Demo User") still render for guests — no email address or phone number is disclosed; a future real app would gate bodies behind ownership too.

### WR-03: Refunded deposit still renders as "Paid $11.25"

**Files modified:** `components/booking/booking-confirmation.tsx`, `app/(main)/booking/[id]/page.tsx`
**Commit:** `0f6afb5`
**Applied fix:** `page.tsx` already selected `mp.status` — it now passes `paymentStatus` through `BookingSummary`, and the Deposit row renders three states: `refunded` → "Refunded {amount}" (seeded f4 case now shows "Refunded $11.25" instead of "Paid $11.25"), `depositPaymentId` → "Paid {amount}", else "—".

### WR-04: Seed corrupts the slot claim (or crashes) when a real booking lands on a sample slot

**Files modified:** `scripts/seed.ts`
**Commit:** `e6b804b`
**Applied fix:** The sample-booking loop now mirrors the cancel-path reopen discipline:
- The sample upsert is wrapped so a `23505` on `bookings_active_slot_idx` (a real active booking holds the sample's slot) **skips that sample booking with a log line** instead of aborting the seed.
- The cancelled-booking reopen only clears `booked_at` when **no other active booking** holds the slot: `UPDATE slots SET booked_at = NULL ... AND NOT EXISTS (SELECT 1 FROM bookings WHERE slot_id = $1 AND status <> 'cancelled' AND id <> $2)`.
- The active-booking claim only stamps `booked_at = now()` when **this sample booking** is the slot's active booking (`EXISTS ... AND id = $sampleId`) — never over a real customer's claim.
- Idempotency preserved (two consecutive runs take the same path when no real bookings collide).

### WR-05: Admin actions rely on the proxy path-match + session only — no admin gate

**Files modified:** none (no code change)
**Commit:** n/a
**Applied fix:** **Documented as accepted risk** per instruction and Phase 1 precedent: the template has no role column (`users` has none in `001_init.sql`) — "admin" means "any authenticated session", matching every Phase 1 admin page. At demo scale with one seeded user this is the locked single-admin model; the recommended hardening (enforce `user.role === "admin"` in the action when roles land) is recorded in `02-REVIEW.md` WR-05 as the forked-app follow-up.

### WR-06: Service radiogroup is not keyboard-reachable without `?service=` preselect

**Files modified:** `components/booking/service-card.tsx`, `components/booking/booking-flow.tsx`
**Commit:** `5bb257f`
**Applied fix:** The group now has a tab stop on a fresh visit: `tabIndex={selected || (index === 0 && !hasSelection) ? 0 : -1}` (new group-level `hasSelection` prop passed from `BookingFlow`), so Tab lands on the first card when nothing is preselected. `handleKeyDown` now also handles **Enter/Space → preventDefault + onSelect()**, so a focused card is selectable by keyboard (a `role="radio"` div fires no click on Enter).

### IN-01: Unused `current` prop on BookingsTable

**Files modified:** `components/admin/bookings-table.tsx`, `app/admin/bookings/page.tsx`
**Commit:** `d6cd9ba`
**Applied fix:** Removed the dead `current: { status; service }` prop from the component's props type and its call site.

### IN-03: Conflict copy is coupled by string literal across module boundary

**Files modified:** `lib/booking.ts`, `app/(main)/book/actions.ts`, `components/booking/booking-dialog.tsx`
**Commit:** `6d19bd6`
**Applied fix:** Exported `BOOKING_CONFLICT_MESSAGE` from `lib/booking.ts` (client-safe, already imported by both sides) and used it in `createBooking`'s two return sites and the dialog's conflict detection — a copy edit can no longer silently break conflict handling.

---

_Fixed: 2026-08-02T20:10:00Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
