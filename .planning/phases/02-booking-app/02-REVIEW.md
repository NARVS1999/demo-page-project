---
phase: 02-booking-app
reviewed: 2026-08-02T12:30:00Z
depth: standard
files_reviewed: 36
files_reviewed_list:
  - __tests__/booking.test.ts
  - __tests__/mock.test.ts
  - __tests__/validate.test.ts
  - app/(main)/book/actions.ts
  - app/(main)/book/error.tsx
  - app/(main)/book/loading.tsx
  - app/(main)/book/page.tsx
  - app/(main)/booking/[id]/error.tsx
  - app/(main)/booking/[id]/loading.tsx
  - app/(main)/booking/[id]/not-found.tsx
  - app/(main)/booking/[id]/page.tsx
  - app/(main)/services/error.tsx
  - app/(main)/services/loading.tsx
  - app/(main)/services/page.tsx
  - app/admin/bookings/actions.ts
  - app/admin/bookings/error.tsx
  - app/admin/bookings/loading.tsx
  - app/admin/bookings/page.tsx
  - app/admin/page.tsx
  - components/admin/booking-filters.tsx
  - components/admin/bookings-table.tsx
  - components/booking/booking-confirmation.tsx
  - components/booking/booking-dialog.tsx
  - components/booking/booking-flow.tsx
  - components/booking/service-card.tsx
  - components/booking/slot-picker.tsx
  - components/layout/admin-shell.tsx
  - components/ui/checkbox.tsx
  - db/migrations/003_booking.sql
  - lib/booking.ts
  - lib/mock/email.ts
  - lib/mock/payment.ts
  - lib/mock/sms.ts
  - lib/site.ts
  - lib/validate.ts
  - scripts/seed.ts
findings:
  critical: 0
  warning: 6
  info: 3
  total: 9
status: fixed
---

# Phase 2: Code Review Report

**Reviewed:** 2026-08-02T12:30:00Z
**Depth:** standard
**Files Reviewed:** 36
**Status:** issues_found

## Summary

Reviewed all 36 source files changed in commits `9c7e1bd`..`ac26d98` (Phase 2, plans 02-01 data layer + 02-02 UI): the `003_booking.sql` migration, the atomic `createBooking` claim transaction, race-safe `cancelBooking`/`cancelBookingAdmin`/`confirmBooking`, the rolling-window seed, `lib/booking.ts`/`bookingSchema`, and the full UI surface (/services, /book, /booking/[id], /admin/bookings + shared components).

**The core transactional design is sound:** the conditional UPDATE claim with rowCount-0 conflict mapping is correct; the 23505 fallback is correctly scoped; in-transaction deposits/refunds roll back cleanly; the NOT EXISTS reopen guard survives the concurrent-claim race analysis (READ COMMITTED re-evaluation via EvalPlanQual protects the claim); all SQL is parameterized (no injection found — the admin filter fragments are allowlist-validated before interpolation); `force-dynamic` is present on all four DB pages; server-only boundaries are respected (`lib/booking.ts` correctly has no `server-only`); owner-scoped `WHERE b.user_id` on `cancelBooking` and generic anti-enumeration copy are correct.

**Key concerns:** (1) the write path has no future-time guard while the read path renders today's already-passed slots — a user can book a slot that has already started and can then never self-cancel it; (2) the seed can corrupt the `booked_at` claim or crash when a real booking lands on a sample slot under the rolling window; (3) PII (customer email) renders on the public confirmation page; (4) refunded deposits still render as "Paid". No critical/security-class findings: no injection, no hardcoded secrets, no auth bypass beyond the template's pre-existing single-admin (session-only) model.

## Warnings

### WR-01: Past-time slots are bookable — write path has no future-time guard

**File:** `app/(main)/book/actions.ts:52-73`, `app/(main)/book/page.tsx:51`, `components/booking/slot-picker.tsx:64-89`
**Issue:** The availability query window is `slot_date >= CURRENT_DATE` (page.tsx:51) with **no time-of-day condition**, so today's already-elapsed slot times are rendered as selectable pills (slot-picker has no past-time check). Worse, `createBooking`'s SELECT (actions.ts:52-60) and claim UPDATE (actions.ts:68-72) have **no time guard at all** — they accept any slot id, including lingering slots from previous seed windows (`slot_date < CURRENT_DATE`, which the seed deliberately leaves in the table). A booking made on an already-started/passed slot is then un-cancellable by its owner: `cancelBooking`'s upcoming guard (actions.ts:152-153) refuses it, leaving a stuck booking only an admin can remove. This is a TOCTOU mismatch between what the UI offers and what the action accepts.
**Fix:** Apply the same guard the cancel path already uses, in both places:
```ts
// page.tsx availability query:
AND (s.slot_date > CURRENT_DATE
     OR (s.slot_date = CURRENT_DATE AND s.slot_time > CURRENT_TIME))

// actions.ts createBooking slot SELECT (unknown/past → conflict, never a 500):
AND (s.slot_date > CURRENT_DATE
     OR (s.slot_date = CURRENT_DATE AND s.slot_time > CURRENT_TIME))
```
With the server filtering, slot-picker needs no client-side change (defense-in-depth: also gate past pills in the picker).

### WR-02: Customer email + notice recipients are PII rendered on a public page

**File:** `components/booking/booking-confirmation.tsx:173-177, 232-256`; `app/(main)/booking/[id]/page.tsx:58-88`
**Issue:** `/booking/[id]` is public by construction (not in the proxy matcher — by design for shareable confirmations). The component renders `Sent to {booking.userEmail}` (line 174) and full notice recipient addresses and message bodies to **any anonymous visitor** who has or guesses a booking UUID. UUIDs are unguessable, but once a link is shared (the page's entire purpose), the customer's email address is disclosed to everyone with the link.
**Fix:** Gate the address line behind ownership; keep the rest for guests:
```tsx
{isOwner && (
  <p className="text-base text-muted-foreground">
    Sent to {booking.userEmail}
    <span aria-hidden="true"> · </span>
    {formatSlotDate(booking.slotDate)}
  </p>
)}
```
(Or mask: `{booking.userEmail.replace(/^(.{2}).*(@.*)$/, "$1•••$2")}` for guests.)

### WR-03: Refunded deposit still renders as "Paid $11.25"

**File:** `components/booking/booking-confirmation.tsx:198-205`; `app/(main)/booking/[id]/page.tsx:83`
**Issue:** The Deposit row shows `Paid {amount}` whenever `depositPaymentId` exists — with no knowledge of the payment's status. The seeded demo case f4 (cancelled booking, refunded deposit, `e4222222`) renders **"Paid $11.25"** on a booking whose deposit was already refunded — factually wrong and contradicts the cancel-flow's "Deposit refunded" toast. `page.tsx` selects `mp.status` (line 40) but drops it before building `BookingSummary`.
**Fix:** Pass `paymentStatus` through `BookingSummary` and render the three states:
```tsx
{booking.paymentStatus === "refunded"
  ? `Refunded ${formatUsd(booking.paymentAmount ?? 0)}`
  : booking.depositPaymentId
    ? `Paid ${formatUsd(booking.paymentAmount ?? 0)}`
    : "—"}
```

### WR-04: Seed corrupts the slot claim (or crashes) when a real booking lands on a sample slot

**File:** `scripts/seed.ts:477-500`
**Issue:** Under the rolling window, sample slots are deterministic (service slug + nth template day + fixed time). If a real user books the slot that sample booking f4 (cancelled) targets, the next seed run executes `UPDATE slots SET booked_at = NULL WHERE id = ${slotId}` (line 496) and **force-clears the claim of the real active booking** — the slot then appears claimable (booked_at NULL) until the next claimer hits the 23505 fallback ("That slot was just taken.") despite an open-looking pill. If a real active booking targets any *active* sample slot (f1-f3), the sample upsert itself raises 23505 on `bookings_active_slot_idx` and the whole seed crashes. Both failure modes are seeded-demo-data interactions with real app data — the "idempotent seed" promise breaks.
**Fix:** Reopen only when the slot is genuinely free, and skip/relocate sample slots already held by real bookings:
```ts
if (booking.status === "cancelled") {
  await sqlDirect`
    UPDATE slots SET booked_at = NULL WHERE id = ${slotId}
      AND NOT EXISTS (SELECT 1 FROM bookings
                       WHERE slot_id = ${slotId} AND status <> 'cancelled'
                         AND id <> ${booking.id})`;
}
```
(and wrap the sample upsert so a 23505 on the active-slot index skips that sample booking with a log line instead of aborting).

### WR-05: Admin actions rely on the proxy path-match + session only — no admin gate

**File:** `app/admin/bookings/actions.ts:30-35, 79-84`; `proxy.ts:47-63`
**Issue:** `confirmBooking`/`cancelBookingAdmin` re-check `getCurrentUser()` but the template has **no role concept** (`users` has no role column, 001_init.sql) — "admin" means "any authenticated session", so `demo@example.com` (and any future registered user) can confirm/cancel/refund **any** booking. This matches the Phase 1 pattern (admin pages also session-gate only) and is not a Phase 2 regression, but these are the first **money-adjacent server actions** in the template (refund path), and server actions are directly POSTable — the proxy path-match is the only barrier. Worth hardening or at least documenting before this pattern is forked into real apps.
**Fix:** Either (a) document the single-admin assumption in AGENTS.md, or (b) when roles land, enforce in the action itself:
```ts
const user = await getCurrentUser();
if (!user?.role || user.role !== "admin") redirect("/login?next=/admin/bookings");
```

### WR-06: Service radiogroup is not keyboard-reachable without `?service=` preselect

**File:** `components/booking/service-card.tsx:51-58, 36-49`
**Issue:** Roving tabindex: each card gets `tabIndex={selected ? 0 : -1}`. With no preselect (fresh visit to `/book`), **every** card is `-1`, so Tab never lands on the group and arrow-key navigation is unreachable — keyboard-only users cannot select a service. Additionally, once focused, Enter/Space do nothing (`handleKeyDown` only handles arrows; a `div` with `role="radio"` does not fire click on Enter). This regresses the claimed "a11y 1: arrow-key navigation" (SUMMARY 02-02, D3).
**Fix:**
```tsx
tabIndex={selectable ? (selected || (index === 0 && !hasSelection) ? 0 : -1) : undefined}
// + in handleKeyDown:
if (event.key === "Enter" || event.key === " ") {
  event.preventDefault();
  onSelect?.();
}
```
(Pass `hasSelection` (group-level) into the card, or lift the roving-index to the parent.)

## Info

### IN-01: Unused `current` prop on BookingsTable

**File:** `components/admin/bookings-table.tsx:173-178`; `app/admin/bookings/page.tsx:123`
**Issue:** `BookingsTable` declares `current: { status: string; service: string }` in its props type, the page passes it, and the component never reads it — dead prop (lint-visible). Remove it from the type, the destructure, and the call site.

### IN-02: Client/DB timezone drift in the same-day cancel guard

**File:** `app/(main)/booking/[id]/page.tsx:64-72` vs `app/(main)/book/actions.ts:152-153`
**Issue:** The page computes `canCancel` from **JS-local** time (`toDateKey(now)`, local HH:MM), while the action enforces it from **DB time** (`CURRENT_DATE`/`CURRENT_TIME`, Neon UTC). On a non-UTC host (e.g., local Windows dev) a same-day evening booking can show a cancel button the action refuses, or hide one the action would allow. Works on Vercel (UTC) only by coincidence. Pick one authority — e.g., compute the guard in SQL on the page too (`slot_date > CURRENT_DATE OR ...` in the booking SELECT) — and keep the client display-only.

### IN-03: Conflict copy is coupled by string literal across module boundary

**File:** `components/booking/booking-dialog.tsx:35` vs `app/(main)/book/actions.ts:119, 122`
**Issue:** The dialog detects the atomic conflict by comparing `state.message === "That slot was just taken."` (CONFLICT_MESSAGE). Any future copy edit to the action's message silently breaks conflict handling — the dialog would stay open with a plain destructive Alert instead of closing + refreshing + clearing the selection. Export a shared constant (e.g., from `lib/booking.ts`) and use it in both files.

---

_Reviewed: 2026-08-02T12:30:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
