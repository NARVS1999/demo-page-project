# Phase 2: Booking App - Research

**Researched:** 2026-08-02
**Domain:** Service scheduling — atomic slot claiming, pre-generated slot calendar, mock notifications (email/SMS/payment), admin booking management
**Confidence:** HIGH (patterns verified against in-repo Phase 0/1 code + official Neon driver docs; standard Postgres semantics tagged [ASSUMED])

## Summary

Phase 2 builds the second flagship on the Phase 0 template + Phase 1 patterns: a barber-shop booking app with 3 services, a rolling 14-day slot calendar, an atomic booking flow (double-booking prevention), and admin confirm/cancel with mock email/SMS/payment integration. The phase is **purely additive** — no existing table is renamed or restructured; `003_booking.sql` creates `services`, `slots`, `bookings` and adds nullable `booking_id` columns to `mock_emails`/`mock_sms` so the confirmation page can show booking-linked notices. Zero new npm packages (UI-SPEC Registry Safety); the only install action is `npx shadcn@latest add checkbox`.

The core technical challenge is the **atomic slot claim**: `withPool()` (already in `lib/db.ts`) wraps `UPDATE slots SET booked_at = now() WHERE id = $1 AND booked_at IS NULL` with a rowcount check — 0 rows means "already taken" (CONTEXT-locked decision). Inside the transaction, statements must use **pg-style `client.query(text, $n params)`**, NOT the HTTP `sql` tagged template (verified: Neon `Pool`/`Client` are node-postgres compatible per official docs; the `sql` template is HTTP-only and cannot join an interactive transaction). The mock deposit payment must run **inside** the transaction — this requires a small backwards-compatible extension to `lib/mock/payment.ts` (`createPayment(..., client?)`), because the current implementation uses module-level HTTP `sql` and would otherwise break atomicity (orphan payment or claimed-without-deposit).

The second-hardest area is **seed idempotency with a rolling time window**: the window shifts every day, so fixed seed data would drift into the past. Slots are keyed on `(service_id, slot_date, slot_time)` with `ON CONFLICT DO NOTHING` (new days append; old days linger harmlessly and are filtered by `slot_date >= CURRENT_DATE`); the 4 sample bookings (2 confirmed, 1 pending, 1 cancelled) are upserted with fixed ids but **re-point their `slot_id` at the current window each run** via subselects, so demo data never goes stale.

**Primary recommendation:** follow the CONTEXT-locked claim model exactly (conditional UPDATE + rowcount), extend the three mock services with optional transaction/booking params instead of bypassing them, store all money as **integer cents** (avoids the pg `numeric` → string pitfall and matches the existing `mock_payments.amount` cents convention in the seed), and compute the calendar window server-side on plain `date`/`time` columns (no timestamptz, no timezone math — documented demo limitation).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Booking Schema & Transaction Model**
- Pre-generated slot rows per service+date+time — availability = slot not yet booked; bookings table references the slot
- Double-booking prevention: atomic conditional UPDATE inside a Pool transaction (`UPDATE slots SET ... WHERE id = $1 AND booked_at IS NULL`), rowcount check → 0 rows means "already taken" — no two users can claim the same slot
- Optional 25% deposit via existing lib/mock/payment createPayment at booking time (BOOK-08) — refund on admin/user cancellation
- Users cancel their own upcoming bookings; admin can confirm or cancel; cancelled slots reopen for booking

**Slot Calendar UX**
- Rolling 14-day list grouped by date — each day shows that service's time-slot pills with available/taken states; mobile-friendly over a month grid
- Single-page booking flow: pick service → date → slot → confirm via dialog
- Dedicated `/booking/[id]` confirmation page — shareable, shows the mock email/SMS notices sent
- Login required to book (reuses template auth + ownership-scoped queries); browsing services and slot availability stays public

**Admin Management & Notifications**
- New `/admin/bookings` section in the existing AdminShell — table with service, user, date/time, status, and confirm/cancel actions
- Status model: `pending → confirmed → cancelled` (new bookings start pending; user or admin cancel)
- Mock email/SMS visibility reuses existing `/admin/emails` + `/admin/sms` pages — mock services already persist there; no new notification UI
- Admin filters: by status and by service, date-sorted

**Demo Data & Domain**
- Barber shop theme with 3 services: Haircut, Beard Trim, Haircut + Beard combo (user-selected over yoga)
- Weekly recurring schedule template per service (days + times) → seed generates slots for the next 14 days
- Sample bookings with mixed statuses (2 confirmed, 1 pending, 1 cancelled), each with linked mock email/SMS rows — realistic demo data, never Lorem ipsum
- Seed idempotency: upserts keyed on service slugs + slot times; re-running seed stays under 200 MB

### the agent's Discretion
- Exact component structure, column layout, and page composition details
- Choice of shadcn components beyond the core set (table, card, badge, dialog, select, alert-dialog, empty-state, stat-card)
- How the booking confirmation page presents mock notification details

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope

### Locked UI-SPEC Constraints (02-UI-SPEC.md — governing where silent over CONTEXT)
- Zero new npm runtime dependencies; ONLY `npx shadcn@latest add checkbox` (official registry CLI)
- Locked date/time formats: `Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" })` → "Tue, Aug 4"; `{ hour: "numeric", minute: "2-digit" }` → "9:30 AM" — one helper, no ad-hoc formats
- Slot availability rule: slot renders `taken` when a non-cancelled booking exists (pending AND confirmed block; cancelled frees) — display via LEFT JOIN bookings WHERE status <> 'cancelled'
- Conflict error copy: "That slot was just taken." / "Pick another time — the available slots have refreshed."; deposit failure: "Payment failed. No charge was made. Try again."
- Booking reference style: `#BK-1042` (mono, display-only)
- Seed realism: Haircut $30/30min, Beard Trim $20/20min, Haircut + Beard $45/50min; weekly template Tue–Sat ~9 AM–5 PM hourly (planner's exact grid); 4 sample bookings all in the upcoming window; cancelled booking's slot free in the calendar
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BOOK-01 | Service listing page | `services` table (slug, name, description, price_cents, duration_min) + `/services` page under `(main)` shell; public by proxy construction (Pattern 1 §migration, Pattern 5 §pages) |
| BOOK-02 | Slot calendar showing available/taken slots | Pre-generated `slots` rows; `/book` page query `LEFT JOIN bookings WHERE status <> 'cancelled'` + `slot_date >= CURRENT_DATE` window (Pattern 2 §availability query); grouped server-side, rendered by `slot-picker` |
| BOOK-03 | Booking flow — user selects slot and confirms | `/book` single-page flow per UI-SPEC; `bookingSchema` in `lib/validate.ts`; `createBooking` server action → `{ok, bookingId}` → toast + `router.push("/booking/{id}")` (Pattern 2) |
| BOOK-04 | Double-booking prevention (atomic slot reservation) | CONTEXT-locked: `withPool` + conditional `UPDATE slots SET booked_at = now() WHERE id = $1 AND booked_at IS NULL`, rowcount 0 → conflict message; belt-and-braces partial unique index `bookings_active_slot_idx (slot_id) WHERE status <> 'cancelled'` (Pattern 2, Code Example) |
| BOOK-05 | Admin confirm/cancel bookings | `/admin/bookings` page (proxy + AdminShell + layout auth) with GET form filters (status/service) and `confirmBooking`/`cancelBookingAdmin` actions; confirm sends notice email per UI-SPEC dialog copy (Pattern 3, Pattern 5) |
| BOOK-06 | Mock email confirmation (saved to DB, viewable in admin) | `email.sendEmail({to, subject, text, bookingId?})` — extended with optional `booking_id` link; called after COMMIT; visible in existing `/admin/emails` AND on `/booking/[id]` (Pattern 3) |
| BOOK-07 | Mock SMS reminder (logged to table) | `sms.sendSms({to, message, bookingId?})` — same extension pattern; visible in `/admin/sms` and confirmation page (Pattern 3) |
| BOOK-08 | Optional mock payment deposit | `payment.createPayment({amount, currency}, client?)` extension runs INSIDE the booking transaction (no partial state); 25% of `price_cents` computed server-side; `payment.refund(id, client?)` on any cancel path (Pattern 2 §deposit, Pattern 4 §seed) |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- `proxy.ts`, not `middleware.ts`; never add `export const runtime` to proxy.ts — **proxy.ts untouched this phase** (/services, /book, /booking/[id] intentionally unmatched → public)
- `export const dynamic = 'force-dynamic'` on every DB-reading page/route handler
- Dual Neon URLs — pooled for app, direct for migrations/seed
- Server-only boundaries: `lib/db.ts`, `lib/session.ts`, `lib/mock/*` start with `import "server-only"`; client imports are build errors
- bcryptjs only in route handlers / seed
- Raw SQL only — neon tagged templates for HTTP one-shots; **pg-style `client.query(text, $n params)` inside `withPool`** (PoolClient is node-postgres compatible — no tagged templates on the Pool client)
- Migrations: idempotent `db/migrations/*.sql` applied by `npm run seed` with `schema_migrations` ledger; every statement `IF [NOT] EXISTS`-guarded, `;\n` terminated (runner split rule); upserts via `ON CONFLICT`; seed reports size and exits non-zero at ≥ 200 MB
- No ORM, no Prisma, no `ws` package (Node 24 global WebSocket)
- Env contract: 9 vars; **no new env vars needed for Phase 2**
- Template-wide server-action pattern: actions return `{ok: true}`; client navigates + toasts (redirect() discards return values)
- Ownership-scoped SQL (`WHERE user_id`) + generic messages, 401/404 anti-enumeration

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Service listing + slot availability reads | API / Backend (RSC) | — | Server components query Neon directly with `force-dynamic`; no client fetch |
| Slot claim / booking creation | API / Backend (server action) | Database (transaction) | `createBooking` action wraps `withPool(BEGIN/COMMIT)`; the claim is one atomic UPDATE |
| Double-booking prevention | Database | API / Backend | Conditional UPDATE + partial unique index = DB-level truth; rowcount → conflict message = UI face |
| Deposit payment | API / Backend (mock service) | Database (in-txn row) | `createPayment(..., client)` writes the mock_payments row inside the booking transaction |
| Notifications (email/SMS) | API / Backend (mock services) | — | Post-COMMIT HTTP writes; never fail in mock mode; linked via `booking_id` |
| Booking flow UI state (service/slot selection, dialog) | Browser / Client | — | `service-card`, `slot-picker`, `booking-dialog` are client components over server props |
| Admin bookings management | API / Backend | — | GET form filters (server-rendered) + confirm/cancel server actions |
| Auth gating (public vs admin vs owner) | API / Backend (proxy.ts + session) | — | Matcher covers `/admin`; public routes unmatched; owner checks in cancel actions |
| Date/time formatting | Browser / Client (shared helper) | — | `lib/booking.ts` pure helpers — client-safe (no "server-only"), locked Intl formats |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @neondatabase/serverless | 1.1.0 (existing, pinned) | `sql` HTTP one-shots + `withPool` interactive transactions | Verified official docs: Pool/Client are node-postgres drop-in compatible — `client.query(text, params)`, `$n` placeholders, results carry `rows` + `rowCount` |
| zod | 4.4.3 (existing) | `bookingSchema` (slotId uuid, deposit preprocess) in `lib/validate.ts` | Template validation convention; client-safe module |
| shadcn/ui `checkbox` | CLI add (4.16.1 local) | Deposit toggle in `booking-dialog` | ONLY new component; official registry CLI add (same pattern as Phase 0/1) |
| Intl.DateTimeFormat | platform | Locked date/time formats | UI-SPEC lock — no date library; helpers in `lib/booking.ts` |

**This phase adds ZERO new npm runtime dependencies.** Everything reuses the Phase 0 stack (Next 16.2.12, React 19.2.4, Tailwind v4, lucide-react, sonner, radix-ui 1.6.7).

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lib/mock (email, sms, payment) | existing | Notifications + deposit/refund | Extended with OPTIONAL params only (backwards compatible — mock tests unchanged) |
| lib/db.ts `withPool` | existing | All booking/cancel transactions | Every multi-statement write path; never module-scope Pool |
| lib/utils.ts `isUuid` | existing | Guard all id params before SQL | Every action taking slotId/bookingId |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Conditional UPDATE + rowcount (LOCKED) | `SELECT ... FOR UPDATE` (project-level research suggestion) | FOR UPDATE needs a second round-trip (SELECT then UPDATE) and holds a row lock across both; the conditional UPDATE claims in one atomic statement. CONTEXT locked the UPDATE; keep FOR UPDATE only as a documented alternative |
| `booked_at timestamptz` on slots (claim marker) | Pure bookings-join availability | Both kept: `booked_at` is the write-side claim guard; display uses the bookings join per UI-SPEC. The two transactions (claim, cancel) keep them consistent |
| Plain `date` + `time` columns | `timestamptz` slot starts | Wall-clock columns need zero timezone math (no DST, no UTC drift); the rolling window is `CURRENT_DATE..+13`. Tradeoff: "Today" boundary is server-timezone — accepted demo limitation (Pitfall 1) |
| `price_cents integer` | `numeric` dollars | pg returns `numeric` as JS strings → coercion bugs in deposits/display; integer cents matches the existing `mock_payments.amount` cents convention (seed uses 4999 = $49.99) |
| Extend mock services with optional params | Insert mock_* rows inline in the action | Keeps ONE code path per mock (service file is the single writer); inline INSERTs would fork the SQL and drift from the mock contract |
| Server-side date window | Per-visitor timezone window | Server window is deterministic + cacheable; per-visitor would need tz detection — out of scope for a demo |

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| @radix-ui/react-checkbox | npm | 1.3.11 (2026-07-24 publish) | 51.8M/wk | github.com/radix-ui/primitives | SUS (reason: "too-new" — recent publish of an ~3yr-old official package; no postinstall, not deprecated) | Flagged — planner must add `checkpoint:human-verify` before the shadcn CLI add |

**Packages removed due to [SLOP] verdict:** none — no other packages are proposed this phase.
**Packages flagged as suspicious [SUS]:** `@radix-ui/react-checkbox` — the shadcn CLI's checkbox add writes this into `package.json`. The SUS verdict comes from the "too-new" heuristic on the 1.3.11 publish date, not from any trust signal: it is the official Radix UI primitives package (the project already depends on the `radix-ui` unified package which wraps it), 51.8M weekly downloads, no postinstall script (verified via `npm view`). **The planner must still add the human-verify checkpoint per protocol.** Note the known npm-11 EALLOWSCRIPTS quirk (STATE.md): if the CLI's internal install fails, the working pattern is `npm install @radix-ui/react-checkbox` first, then re-run `npx shadcn@latest add checkbox`.

## Architecture Patterns

### System Architecture Diagram

```
                     ┌────────────────────────────────────────────────────────┐
                     │                    proxy.ts (unchanged)                │
                     │  matcher: /api/* /admin/* /dashboard/* /posts/*        │
                     │  ── /services /book /booking/[id] NOT matched → public │
                     └──────────┬───────────────────────────────┬─────────────┘
                                │                               │
  Guest / demo user             │                       Admin (same session)
  ──────────────────            │                       ─────────────────
  GET /services ────────────────┤                       GET /admin/bookings ──► AdminShell
  │  sql`SELECT ... FROM services`──► Neon              │  (proxy + layout auth)
  │                              │                       │  filters: ?status= ?service= (GET form)
  GET /book?service={slug} ─────┤                       │  sql`bookings ⋈ slots ⋈ services ⋈ users
  │  sql`SELECT slots LEFT JOIN bookings                │       ⋈ mock_payments` ──► Neon
  │      ON slot_id AND status <> 'cancelled'           │  POST confirmBooking ──► withPool:
  │      WHERE slot_date >= CURRENT_DATE` ──► Neon      │      UPDATE bookings SET status='confirmed'
  │  days[] props → slot-picker (client)                │      ──► email.sendEmail (notice)
  │                              │                       │  POST cancelBookingAdmin ──► withPool:
  POST createBooking ────────────┤                       │      status→'cancelled' → reopen slot → refund
  │  getCurrentUser (jose cookie)│                       └──────────────┬──────────────
  │  bookingSchema {slotId, deposit}│                                    │
  │  ▼                            │                       existing: /admin/emails, /admin/sms
  │  withPool(BEGIN)              │                       (mock_* tables now carry booking_id)
  │    client.query(conditional   │
  │      UPDATE slots SET booked_at = now()               /booking/[id] (public, shareable)
  │      WHERE id=$1 AND booked_at IS NULL)  ◄── rowCount 0 → "That slot was just taken."
  │    [deposit] client.query(SELECT price_cents)         GET ──► bookings ⋈ services ⋈ users
  │      → payment.createPayment({amount: 25%}, client)        ⋈ mock_payments ⋈ mock_emails/sms
  │    client.query(INSERT bookings) RETURNING id              (WHERE booking_id = $1)
  │  COMMIT / ROLLBACK                                     POST cancelBooking (owner-scoped)
  │  ──► email.sendEmail({..., bookingId})                     → same cancel txn (status → reopen → refund)
  │  ──► sms.sendSms({..., bookingId})
  │  {ok, bookingId} → toast → router.push(`/booking/${id}`)
```

### Recommended Project Structure (Phase 2 additions)

```
db/migrations/003_booking.sql          # services, slots, bookings + booking_id on mock_emails/mock_sms
lib/booking.ts                        # pure client-safe helpers: bookingRef, depositCents, toDateKey, formatSlotDate/Time
lib/validate.ts                       # + bookingSchema
lib/mock/payment.ts                   # + optional client param (createPayment/refund)
lib/mock/email.ts, lib/mock/sms.ts    # + optional bookingId param
scripts/seed.ts                       # + services, weekly template, 14-day slots, sample bookings + linked notices/payments
app/(main)/services/{page,loading,error}.tsx
app/(main)/book/{page,loading,error}.tsx
app/(main)/book/actions.ts            # createBooking, cancelBooking
app/(main)/booking/[id]/{page,loading,error,not-found}.tsx
components/booking/{service-card,slot-picker,booking-dialog,booking-confirmation}.tsx
app/admin/bookings/{page,loading,error}.tsx
app/admin/bookings/actions.ts         # confirmBooking, cancelBookingAdmin
components/admin/{booking-filters,bookings-table}.tsx
app/admin/page.tsx                    # + Bookings stat card (CalendarClock)
components/layout/admin-shell.tsx     # + "Bookings" group (CalendarCheck) below "Content"
lib/site.ts                           # + { label: "Services", href: "/services" } after Blog
__tests__/booking.test.ts             # TDD for lib/booking.ts helpers
```

### Pattern 1: `003_booking.sql` — additive idempotent migration

Every statement `IF [NOT] EXISTS`-guarded, `;\n` terminated. `CHECK` constraints use the DROP-then-ADD pair (no `IF NOT EXISTS` on ADD CONSTRAINT — Phase 1 lesson). Sequence: services → slots → bookings → mock_* ALTERs → indexes.

```sql
-- 003_booking.sql — Phase 2 booking schema (idempotent; applied by npm run seed)

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents > 0),
  duration_min integer NOT NULL CHECK (duration_min > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  booked_at timestamptz,              -- NULL = available; set by the atomic claim
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slots_service_date_time_key UNIQUE (service_id, slot_date, slot_time)
);
CREATE INDEX IF NOT EXISTS slots_calendar_idx
  ON slots (service_id, slot_date) WHERE booked_at IS NULL;

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES slots(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  price_cents integer NOT NULL,        -- snapshot at booking time
  deposit_payment_id uuid REFERENCES mock_payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled'));

-- Belt-and-braces: one ACTIVE booking per slot, enforced by the DB. A cancelled
-- booking frees the slot for a new active booking (partial-index predicate).
CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot_idx
  ON bookings (slot_id) WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status, created_at DESC);

-- Link notices to bookings (confirmation page + seed realism). Additive — the
-- existing mock_* readers (admin/emails, admin/sms) ignore the new column.
ALTER TABLE mock_emails ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;
ALTER TABLE mock_sms ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS mock_emails_booking_idx ON mock_emails (booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS mock_sms_booking_idx ON mock_sms (booking_id) WHERE booking_id IS NOT NULL;
```

### Pattern 2: Atomic booking transaction (double-booking prevention)

**The locked claim:** `withPool` from `lib/db.ts` (verified in-repo: per-request Pool, BEGIN/COMMIT/ROLLBACK, client.release() + pool.end() in finally). Inside the transaction, all SQL goes through `client.query(text, params)` — the PoolClient is node-postgres compatible, and the module-level `sql` tagged template (HTTP) CANNOT be used there (verified: neon docs — HTTP for one-shot, WebSockets for interactive transactions).

Sequence inside `withPool`:
1. **Claim:** `UPDATE slots SET booked_at = now() WHERE id = $1 AND booked_at IS NULL` → `rowCount === 0` means someone else claimed it → return the conflict message, never throw a 500.
2. **Deposit (BOOK-08, optional):** read `price_cents`, compute `Math.round(price_cents * 0.25)` server-side, then `payment.createPayment({ amount, currency: "usd" }, client)` — the extended mock writes the mock_payments row **in the same transaction**. If the claim failed, ROLLBACK removes the payment row — no orphan, no partial state.
3. **Insert:** `INSERT INTO bookings (slot_id, user_id, status, price_cents, deposit_payment_id) VALUES ($1, $2, 'pending', $3, $4) RETURNING id`.

After COMMIT: `email.sendEmail` + `sms.sendSms` (module-level `sql` — fine post-commit; mock mode never fails). Post-commit notifications are acceptable: the booking is the atomic unit; a notice is a log row.

**Cancel transaction (user or admin, one action reused):**
1. `UPDATE bookings b SET status = 'cancelled', updated_at = now() FROM slots s WHERE b.id = $1 AND b.slot_id = s.id AND b.status IN ('pending','confirmed') [AND b.user_id = $2 — owner cancel only] [AND (s.slot_date > CURRENT_DATE OR (s.slot_date = CURRENT_DATE AND s.slot_time > CURRENT_TIME)) — user "upcoming" guard] RETURNING b.slot_id, b.deposit_payment_id` — rowCount 0 → generic "This booking no longer exists." (anti-enumeration).
2. **Reopen, race-safe:** `UPDATE slots SET booked_at = NULL WHERE id = $1 AND booked_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM bookings WHERE slot_id = $1 AND status <> 'cancelled' AND id <> $2)` — the NOT EXISTS guard means the reopen only clears a claim still belonging to the cancelled booking; a fresh claim from a concurrent booker is never wiped. The UI-SPEC conflict flow ("That slot was just taken." + refreshed list) absorbs the rare spurious-conflict race.
3. **Refund:** `payment.refund(deposit_payment_id, client)` when present (mock sets status = 'refunded').

### Pattern 3: Mock service extensions (backwards compatible)

The mock services stay the single writer of their tables. Extensions are OPTIONAL params — all existing call sites and mock.test.ts (which stubs `@/lib/db`'s `sql` and never passes a client) pass unchanged:

```ts
// lib/mock/payment.ts — optional client runs inside the caller's transaction
export async function createPayment(
  { amount, currency = "usd", fail = false }: { amount: number; currency?: string; fail?: boolean },
  client?: import("@neondatabase/serverless").PoolClient,
) {
  assertMockMode();
  const id = randomUUID();
  const status = fail ? "failed" : "succeeded";
  if (client) {
    await client.query(
      `INSERT INTO mock_payments (id, amount, currency, status) VALUES ($1, $2, $3, $4)`,
      [id, amount, currency, status],
    );
  } else {
    await sql`INSERT INTO mock_payments (id, amount, currency, status)
      VALUES (${id}, ${amount}, ${currency}, ${status})`;
  }
  return { id, status: status as "succeeded" | "failed", amount, currency };
}

// lib/mock/email.ts + lib/mock/sms.ts — static SQL with a nullable booking_id param
export async function sendEmail({ to, subject, text, bookingId }: {
  to: string; subject: string; text: string; bookingId?: string;
}) {
  assertMockMode();
  const id = randomUUID();
  await sql`INSERT INTO mock_emails (id, recipient, subject, body, status, booking_id)
    VALUES (${id}, ${to}, ${subject}, ${text}, 'sent', ${bookingId ?? null})`;
  return { id, status: "sent" as const };
}
```

The confirmation page then queries `SELECT ... FROM mock_emails WHERE booking_id = $1` (and same for mock_sms) — the UI-SPEC "Notices sent" rows with zero extra tables.

### Pattern 4: Seed — rolling 14-day window, re-pointing sample bookings

Phases: services (fixed ids, `e1/e2/e3…` hex prefixes) → slots (14-day generation from `WEEKLY_TEMPLATE`, `ON CONFLICT (service_id, slot_date, slot_time) DO NOTHING`) → sample bookings (fixed ids `f1…f4`, upsert re-pointing slot_id into the current window) → booked_at marks → linked notices + deposit payments.

Key mechanics (with the Phase 1 seed lessons baked in — phantom `$n` placeholders, invalid UUID prefixes, JS-computed values as params):

```ts
// Weekly template: Tue–Sat, hourly 09:00–16:00 (16:00 start; 17:00 last end)
const WEEKLY_TEMPLATE: Record<number, string[]> = {
  2: ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00"],
  3: ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00"],
  4: ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00"],
  5: ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00"],
  6: ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00"],
};

function toDateKey(d: Date): string {   // local YYYY-MM-DD, computed in JS
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

for (let offset = 0; offset < 14; offset++) {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  const times = WEEKLY_TEMPLATE[day.getDay()];
  if (!times) continue;
  for (const service of SERVICES) {
    for (const time of times) {
      // explicit ::date / ::time casts — the string params need a target type
      await sqlDirect`INSERT INTO slots (service_id, slot_date, slot_time)
        VALUES (${service.id}, ${toDateKey(day)}::date, ${time}::time)
        ON CONFLICT (service_id, slot_date, slot_time) DO NOTHING`;
    }
  }
}
```

Sample bookings (UI-SPEC: 2 confirmed, 1 pending, 1 cancelled; all in the upcoming window; cancelled booking's slot free in the calendar):

```ts
const SAMPLE_BOOKINGS = [
  { id: "f1111111-1111-4111-8111-111111111111", serviceSlug: "haircut",     daysAhead: 2, time: "10:00", status: "confirmed", deposit: true },
  { id: "f2222222-2222-4222-8222-222222222222", serviceSlug: "beard-trim",  daysAhead: 3, time: "11:00", status: "confirmed", deposit: false },
  { id: "f3333333-3333-4333-8333-333333333333", serviceSlug: "haircut",     daysAhead: 1, time: "14:00", status: "pending",   deposit: false },
  { id: "f4444444-4444-4444-8444-444444444444", serviceSlug: "haircut-beard", daysAhead: 4, time: "15:00", status: "cancelled", deposit: true },
];
// upsert — slot_id re-pointed into the current window on EVERY run:
//   slot_id = (SELECT id FROM slots
//              WHERE service_id = (SELECT id FROM services WHERE slug = ${serviceSlug})
//              AND slot_date = ${toDateKey(addDays(now, daysAhead))}::date
//              AND slot_time = ${time}::time)
// then: non-cancelled → UPDATE slots SET booked_at = now() WHERE id = ${slotId};
//       cancelled    → UPDATE slots SET booked_at = NULL WHERE id = ${slotId};  (reopen rule demo)
// deposit bookings → fixed payment ids (e4…): status 'succeeded', EXCEPT the cancelled one = 'refunded'
// notices → fixed email ids (a3…/a4…) + sms ids (b3…/b4…) with booking_id = the booking id
```

Add `services`, `slots`, `bookings` to the TABLES report array (200 MB gate stays accurate). Growth: ~1 new day of slots per re-run (~24 rows) — trivial vs the 200 MB gate.

### Pattern 5: Pages, actions, and integration points

- **Public by construction:** `/services`, `/book`, `/booking/[id]` are NOT in the proxy matcher (only `/api /admin /dashboard /posts`) — no proxy.ts change, same as `/blog` in Phase 1. All three pages: `export const dynamic = "force-dynamic"`.
- **Actions** follow the Phase 1 template: `"use server"`, `FormState` return (`{ok}` / `{message}` / `{errors}`), `getCurrentUser` re-check + `redirect("/login?next=...")`, `isUuid` guards, `flattenError(parsed.error).fieldErrors`, `revalidatePath`. `createBooking` returns `{ok: true, bookingId}` so the dialog can `router.push("/booking/{id}")` after the toast (redirect() would discard the return).
- **Availability query** (display per UI-SPEC rule 10):
```sql
SELECT s.id, to_char(s.slot_time, 'HH24:MI') AS slot_time, s.slot_date::text AS slot_date,
       (b.id IS NOT NULL) AS taken
FROM slots s
LEFT JOIN bookings b ON b.slot_id = s.id AND b.status <> 'cancelled'
WHERE s.service_id = ${serviceId}
  AND s.slot_date >= CURRENT_DATE AND s.slot_date <= CURRENT_DATE + 13
ORDER BY s.slot_date, s.slot_time;
```
`to_char` gives "09:00" (the pg `time` default is "09:00:00"); date grouping happens server-side into the `days[]` prop shape the UI-SPEC locks.
- **Admin page:** `/admin/bookings` inside the existing AdminShell layout (auth via `app/admin/layout.tsx` — no new guard needed). Filters are a GET form (`?status=all|pending|confirmed|cancelled&service=all|{slug}`) — server-rendered results, identical to the Phase 1 search pattern. Query joins `bookings ⋈ slots ⋈ services ⋈ users ⋈ mock_payments`, `ORDER BY s.slot_date, s.slot_time` (soonest first), optional `WHERE` on status/service; a `COUNT(*)` twin feeds the "N bookings" line.
- **AdminShell:** add group "Bookings" (`{ label: "Bookings", href: "/admin/bookings", icon: <CalendarCheck/> }`) below "Content"; Admin overview gains a Bookings `stat-card` (CalendarClock icon, total bookings count) → 6 cards.
- **Nav:** `lib/site.ts` `defaultNav` inserts `{ label: "Services", href: "/services" }` after Blog.

### Anti-Patterns to Avoid

- **Running the mock deposit outside the transaction:** `createPayment` today uses HTTP `sql`; calling it before/after `withPool` creates orphan payment rows (claim failed) or claimed-without-deposit states (payment failed). Always pass the `client` into the extended mock.
- **Tagged templates inside `withPool`:** the `sql` template is HTTP-only; `withPool`'s callback must use `client.query(text, $n params)`. Mixing them throws or silently bypasses the transaction.
- **Reopening a slot unconditionally on cancel:** a concurrent booking may have claimed it; the NOT EXISTS guard is mandatory.
- **Storing prices as `numeric`:** pg returns strings → `Math.round(price * 0.25)` becomes string concat. Integer cents everywhere.
- **Displaying `time` columns raw:** "09:00:00" leaks seconds; `to_char(..., 'HH24:MI')` or the helper.
- **Deriving the booking ref from a DB sequence:** a display ref (`#BK-` + first 4 uuid chars, uppercase) is enough and deterministic; never store it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Double-booking prevention | In-app locks / singletons / optimistic client checks | Atomic conditional UPDATE + partial unique index | Serverless has no single instance; the DB is the only shared truth. The UPDATE's rowcount + the partial unique index cover the race in two independent layers |
| Interactive transactions | BEGIN/COMMIT boilerplate per action | `withPool()` from `lib/db.ts` | Already built + serverless-safe (per-request Pool, rollback in finally) |
| Notifications | New notification tables/UI | `email.sendEmail` / `sms.sendSms` (+ optional `bookingId`) | Mock tables + `/admin/emails` + `/admin/sms` already exist; UI-SPEC: "no new notification UI" |
| Payments | Inline payment row INSERTs | `payment.createPayment(..., client)` | Keeps the mock service as the single writer; refund path already exists |
| Date/time formatting | date-fns / dayjs / manual string building | `lib/booking.ts` helpers over `Intl.DateTimeFormat` | UI-SPEC locks two formats; zero new deps is a hard constraint |
| Calendar UI | A calendar library (month grid) | 14-day grouped list per UI-SPEC | UI-SPEC locked list-over-grid for mobile; zero new deps |
| Booking reference | Sequence table / generation logic | `#BK-` + uuid slice (display-only) | Deterministic, no new state; collisions irrelevant at demo scale |

**Key insight:** every hard problem in this phase (atomicity, scheduling, notifications, payments) already has a template-built solution or a locked decision. The risk is not building new machinery — it's wiring the existing machinery together in the right order (claim → deposit → insert, all in one transaction) and keeping seed data fresh under a rolling window.

## Runtime State Inventory

> Additive greenfield phase — no renames, no data migrations. Verified by reading `db/migrations/001_init.sql` + `002_cms.sql` (no Phase 2 table evolution), `scripts/seed.ts` (TABLES array), and `lib/mock/*` (table writers).

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `mock_emails`/`mock_sms` gain only a nullable `booking_id` column (additive ALTER, backfilled NULL) | None (no data migration) |
| Live service config | None — no external services with Phase 2 config | — |
| OS-registered state | None | — |
| Secrets/env vars | None — no new env vars (9-var contract unchanged) | — |
| Build artifacts | None | — |

## Common Pitfalls

### Pitfall 1: Timezone drift in the rolling 14-day window
**What goes wrong:** "Today" and the 14-day boundary shift depending on who computes them — Vercel runs UTC, local dev runs local time, visitors run their own. A `timestamptz` slot model would make "is this slot today" and DST handling a correctness minefield.
**Why it happens:** serverless timezone = UTC; the seed and the page queries must agree on what "today" means.
**How to avoid:** store `slot_date date` + `slot_time time` (shop wall-clock, no tz); compute the window server-side (`CURRENT_DATE`..`CURRENT_DATE + 13` in both seed and query — they agree by construction). Accept and document the limitation: the "Today" tag is server-tz, not visitor-tz. Keep `booked_at timestamptz` only as a write-side marker (set/cleared by transactions, never compared to now in queries).
**Warning signs:** seed-generated slots labeled "today" on the wrong day in local dev vs prod; DST drift complaints.

### Pitfall 2: Rolling window makes fixed seed data go stale
**What goes wrong:** sample bookings reference slots; re-running seed tomorrow leaves them pointing at yesterday's window → the demo calendar shows no taken slots and the admin table shows past dates.
**Why it happens:** idempotent upserts never re-point rows; time is the one dimension that moves.
**How to avoid:** the sample-booking upsert resolves `slot_id` by subselect on `(service slug, toDateKey(now + daysAhead), time)` every run (`ON CONFLICT (id) DO UPDATE SET slot_id = EXCLUDED.slot_id, ...`). Slots use `ON CONFLICT DO NOTHING` (new days append, old days linger — harmless, filtered by `slot_date >= CURRENT_DATE` in queries; ~24 rows/day growth).
**Warning signs:** after a second seed run the calendar has zero taken pills.

### Pitfall 3: Deposit outside the transaction (orphan/partial states)
**What goes wrong:** `createPayment` before the claim → payment row with no booking on conflict; after the claim → slot claimed with no payment on failure.
**Why it happens:** the mock service uses HTTP `sql`, which cannot join `withPool`.
**How to avoid:** extend `createPayment`/`refund` with an optional `client` param (Pattern 3) and call them inside the transaction; ROLLBACK undoes the payment row with everything else.
**Warning signs:** mock_payments rows whose id never appears in bookings.deposit_payment_id.

### Pitfall 4: "Already taken" surfacing as a 500
**What goes wrong:** the conditional UPDATE's 0-row result must map to the UI-SPEC conflict Alert ("That slot was just taken."), not an exception.
**Why it happens:** an unhandled empty result reads as a bug; a thrown error becomes a generic server error and the dialog loses the recovery copy.
**How to avoid:** branch on `rowCount === 0` → return `{ message: "That slot was just taken." }`; keep the `bookings_active_slot_idx` 23505 catch as a belt-and-braces fallback to the same message.
**Warning signs:** dialog shows a raw error instead of the conflict Alert.

### Pitfall 5: pg-style params vs tagged templates inside the transaction
**What goes wrong:** `sql` tagged templates inside `withPool`'s callback either throw or execute outside the transaction; `client.query("...${x}...")` string-concatenation is an injection hole.
**Why it happens:** the PoolClient is node-postgres compatible, not neon-template compatible.
**How to avoid:** `client.query("... $1 ... $2", [a, b])` everywhere inside the callback (verified official API + in-repo `BEGIN`/`COMMIT` usage in `lib/db.ts`).
**Warning signs:** "cannot insert multiple commands" or transaction-free writes from the booking action.

### Pitfall 6: Checkbox FormData absence
**What goes wrong:** an unchecked checkbox submits nothing — `formData.get("deposit")` is `null`, and a naive `z.boolean()` rejects it.
**How to avoid:** `deposit: z.preprocess((v) => v === "on", z.boolean()).default(false)` — "on" when checked, false otherwise (Phase 1 preprocess pattern).
**Warning signs:** booking fails validation when the deposit box is unchecked.

### Pitfall 7: Cancel/reopen race
**What goes wrong:** admin cancels while a new booking claims the slot → unconditional `UPDATE slots SET booked_at = NULL` wipes the new claim.
**How to avoid:** guard the reopen with `NOT EXISTS (active booking on this slot other than the one being cancelled)` (Pattern 2). Spurious conflicts in the rare overlap are absorbed by the UI-SPEC conflict flow.
**Warning signs:** two active bookings visible on one slot after a cancel race.

### Pitfall 8: Seed phantom `$n` placeholders (Phase 1 lesson, repeated)
**What goes wrong:** interpolating `${date}` inside a SQL string literal (e.g., building a date string inline) makes neon emit a positional `$n` inside quotes → "could not determine data type of parameter".
**How to avoid:** compute `toDateKey` in JS and pass it as a parameter with explicit `::date`/`::time` casts (Pattern 4).
**Warning signs:** seed fails with parameter-type errors after adding slot generation.

### Pitfall 9: `time` column string leakage
**What goes wrong:** pg returns `time` as "09:00:00" — the UI-SPEC locked format is "9:00 AM"; seconds leak into pills and the admin table.
**How to avoid:** `to_char(s.slot_time, 'HH24:MI')` in queries; the `formatSlotTime` helper parses "HH:MM" for the Intl formatter.
**Warning signs:** ":00" suffixes in slot pills.

### Pitfall 10: shadcn CLI install quirks (npm 11 EALLOWSCRIPTS)
**What goes wrong:** the CLI's internal npm install can fail in this environment (documented in STATE.md for Phase 0/1).
**How to avoid:** if `npx shadcn@latest add checkbox` fails on install, run `npm install @radix-ui/react-checkbox` first, then re-run the CLI. Keep the checkbox component file unchanged afterwards.
**Warning signs:** CLI exits with EALLOWSCRIPTS; checkbox.tsx missing from components/ui.

## Code Examples

Verified against in-repo code (lib/db.ts, actions.ts, seed.ts, mock services) and official Neon driver docs.

### Atomic booking action (the phase's core)
```ts
// app/(main)/book/actions.ts (shape; "use server"; FormState like Phase 1)
import { withPool, sql } from "@/lib/db";
import { payment, email, sms } from "@/lib/mock";
import { getCurrentUser } from "@/lib/session";
import { bookingSchema } from "@/lib/validate";

class BookingConflictError extends Error {}

export async function createBooking(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/book");

  const parsed = bookingSchema.safeParse({
    slotId: formData.get("slotId"),   // z.uuid()
    deposit: formData.get("deposit"), // "on" | null → boolean
  });
  if (!parsed.success) return { errors: flattenError(parsed.error).fieldErrors };
  const { slotId, deposit } = parsed.data;

  try {
    const bookingId = await withPool(async (client) => {
      // 1. Locked atomic claim — one statement, no lock round-trip
      const slot = await client.query(
        `SELECT s.service_id, sv.price_cents
           FROM slots s JOIN services sv ON sv.id = s.service_id
          WHERE s.id = $1`,
        [slotId],
      );
      if (slot.rowCount === 0) throw new BookingConflictError(); // unknown slot
      const priceCents = Number(slot.rows[0].price_cents);

      const claim = await client.query(
        `UPDATE slots SET booked_at = now()
          WHERE id = $1 AND booked_at IS NULL`,
        [slotId],
      );
      if (claim.rowCount === 0) throw new BookingConflictError(); // just taken

      // 2. Deposit INSIDE the txn (mock service via client) — 25%, server-computed
      let depositPaymentId: string | null = null;
      if (deposit) {
        const pay = await payment.createPayment(
          { amount: Math.round(priceCents * 0.25), currency: "usd" },
          client,
        );
        depositPaymentId = pay.id;
      }

      // 3. Booking row (snapshot price; status pending per UI-SPEC)
      const ins = await client.query(
        `INSERT INTO bookings (slot_id, user_id, status, price_cents, deposit_payment_id)
         VALUES ($1, $2, 'pending', $3, $4) RETURNING id`,
        [slotId, user.id, priceCents, depositPaymentId],
      );
      return ins.rows[0].id as string;
    });

    // COMMIT done — notifications after the txn (mock mode never fails)
    await email.sendEmail({
      to: user.email,
      subject: "Booking confirmation",
      text: `Your ${/* service name */ ""} booking is confirmed for ${/* slot */ ""}.`,
      bookingId,
    });
    await sms.sendSms({
      to: "+15551234567",
      message: `Reminder: your booking at ${/* time */ ""}. Reply STOP to opt out.`,
      bookingId,
    });

    revalidatePath("/book");
    return { ok: true, bookingId };
  } catch (error) {
    if (error instanceof BookingConflictError) {
      return { message: "That slot was just taken." }; // UI-SPEC conflict copy
    }
    if ((error as { code?: string }).code === "23505") {
      return { message: "That slot was just taken." }; // partial-index fallback
    }
    throw error;
  }
}
```

### Cancel transaction (shared by user + admin actions)
```ts
// owner cancel adds: AND b.user_id = $2  (admin omits it)
// owner cancel adds: AND (s.slot_date > CURRENT_DATE OR (s.slot_date = CURRENT_DATE AND s.slot_time > CURRENT_TIME))
await withPool(async (client) => {
  const rows = await client.query(
    `UPDATE bookings b SET status = 'cancelled', updated_at = now()
       FROM slots s
      WHERE b.id = $1 AND b.slot_id = s.id
        AND b.status IN ('pending', 'confirmed')
      RETURNING b.slot_id, b.deposit_payment_id`,
    [bookingId],
  );
  if (rows.rowCount === 0) return; // already cancelled / stale → nothing to do
  const { slot_id, deposit_payment_id } = rows.rows[0];
  // Race-safe reopen: never clear a claim that now belongs to ANOTHER booking
  await client.query(
    `UPDATE slots SET booked_at = NULL
      WHERE id = $1 AND booked_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM bookings
           WHERE slot_id = $1 AND status <> 'cancelled' AND id <> $2
        )`,
    [slot_id, bookingId],
  );
  if (deposit_payment_id) await payment.refund(deposit_payment_id, client);
});
```

### Booking confirmation page data (public, shareable)
```ts
// /booking/[id] — one row + two notice queries; unknown id → notFound()
const [row, emails, smsRows] = await Promise.all([
  sql`SELECT b.id, b.status, b.price_cents, b.deposit_payment_id, b.created_at,
             s.slot_date::text, to_char(s.slot_time, 'HH24:MI') AS slot_time,
             sv.name AS service_name, u.name AS user_name, u.email AS user_email,
             mp.status AS payment_status, mp.amount AS payment_amount
        FROM bookings b
        JOIN slots s ON s.id = b.slot_id
        JOIN services sv ON sv.id = s.service_id
        JOIN users u ON u.id = b.user_id
        LEFT JOIN mock_payments mp ON mp.id = b.deposit_payment_id
       WHERE b.id = ${id}`,
  sql`SELECT recipient, subject, body, created_at
        FROM mock_emails WHERE booking_id = ${id} ORDER BY created_at DESC`,
  sql`SELECT recipient, message, created_at
        FROM mock_sms WHERE booking_id = ${id} ORDER BY created_at DESC`,
]);
```
`isOwner = user?.id === row.user_id` (extend the SELECT with `b.user_id`); `canCancel = isOwner && status in pending/confirmed && slot in future`; a cancelled booking still renders (shareable history) with the cancel button hidden (UI-SPEC).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `SELECT ... FOR UPDATE` + separate UPDATE (project-level research STACK.md) | Single conditional `UPDATE ... WHERE booked_at IS NULL` + rowcount | Phase 2 (CONTEXT-locked) | One atomic statement — no lock held across two round-trips; rowcount is the conflict signal |
| `booked boolean` flag on slots | `booked_at timestamptz` claim marker + bookings-join display | Phase 2 | Timestamp gives claim time for free; display derives from the bookings join per UI-SPEC |
| Month-grid calendar UI (FEATURES.md "Calendar view") | 14-day grouped slot list | Phase 2 UI-SPEC | Mobile-first; zero calendar libs; rolling window keeps the demo alive forever |
| `numeric` dollar prices (mock_payments seed) | `price_cents integer` for new booking tables | Phase 2 | Kills the pg numeric→string coercion class of bugs in deposits/display |
| Untracked mock events | `booking_id` linkage on mock_emails/mock_sms | Phase 2 | Confirmation pages and admin outbox/log agree on provenance — no new UI needed |

**Deprecated/outdated:**
- **`middleware.ts` auth convention:** Next 16 renamed it to `proxy.ts` (AGENTS.md hard rule — already applied; do not reintroduce).
- **`ws` package for Neon:** Node 24 has a global WebSocket; `neonConfig.webSocketConstructor` is not needed (verified in lib/db.ts comments).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Neon PoolClient `client.query(text, $n params)` returns pg-style results with `rowCount` | Pattern 2 / Pitfall 5 | If rowCount were absent, `rows.length` on the UPDATE result is equivalent — both documented in node-postgres semantics referenced by the official Neon docs |
| A2 | Partial unique index `WHERE status <> 'cancelled'` enforces one active booking per slot (INSERT 23505 on the second active row) | Pattern 1 | Standard Postgres partial-index semantics; if unsupported on Neon, the conditional UPDATE alone still prevents double-booking (index is belt-and-braces only) |
| A3 | pg `numeric`/`integer` columns: integer arrives as a JS number; numeric arrives as a string | Pattern 4 / Pitfall 3 | Using integer cents everywhere avoids the numeric case entirely; `Number()` coercion used where numeric already exists (mock_payments.amount) |
| A4 | `npx shadcn@latest add checkbox` succeeds (npm 11 EALLOWSCRIPTS workaround known) | Standard Stack | Documented fallback: manual `npm install @radix-ui/react-checkbox` then CLI re-run (STATE.md) |
| A5 | Server-timezone date window is an acceptable "today" boundary for a demo | Pitfall 1 | If rejected, per-visitor tz would need tz detection + window computed per request — a scope change to flag |
| A6 | Admin confirm sends a confirmation email (UI-SPEC confirm dialog copy: "The customer will receive a confirmation notice.") | Pattern 3 | If not wanted, drop the sendEmail call from confirmBooking — no schema impact |
| A7 | SMS reminder is sent immediately at booking time (mock "reminder" is a log row, not a scheduled send) | Pattern 3 | No scheduler exists in the template; scheduling is out of scope (FEATURES.md: real-time/scheduling anti-features) |
| A8 | Mock services never fail in mock mode (`assertMockMode` throws only for `MOCK_*=real`), so post-COMMIT notifications are safe | Pattern 2 | Verified in-repo in lib/mock/*.ts; in "real" mode (reserved for future apps) the booking still exists — only the notice is missing |
| A9 | `#BK-` + first 4 uuid chars uppercase is an acceptable display reference (not unique, not stored) | Pattern 5 | Collisions impossible at demo scale (~65k refs per prefix); display-only per UI-SPEC |

## Open Questions

1. **Deposit display after refund**
   - What we know: UI-SPEC says deposit row shows "Paid {amount}" only when a mock payment row exists, else "—". The cancelled sample booking has a REFUNDED payment row.
   - What's unclear: whether the confirmation page should show "Paid $11.25" (row exists) or surface the refunded status.
   - Recommendation: show "Paid {amount}" from the payment row; the admin bookings table can show the payment status badge for the curious. Planner/verify discretion — no schema impact.

2. **Admin cancel vs user cancel conditions**
   - What we know: user cancel is owner-scoped + future-slot-guarded (UI-SPEC canCancel); admin cancel per UI-SPEC is offered on pending/confirmed rows.
   - What's unclear: whether admin cancel should also refuse past slots (historical cleanup) or always allow.
   - Recommendation: admin may cancel any pending/confirmed row (no future guard) — simplest, matches the locked status model; past bookings just sit in the table as history.

3. **Second demo user for realistic cross-user data**
   - What we know: the template seeds one demo account (demo@example.com); sample bookings all belong to it; the same account is the "admin".
   - What's unclear: whether to seed a second user so the admin table shows a different customer.
   - Recommendation: keep the single demo account (phase scope + CONTEXT silence); the admin table's Customer column still reads realistically ("Demo User"). A second user is a trivial seed extension if the verifier wants it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/dev/tests/seed | ✓ | 24.18.0 | — |
| npm | installs | ✓ | 11.18.0 | — |
| Neon Postgres (Phase 0/1 seeded) | all booking data | ✓ | via .env.local (both URLs present) | — |
| shadcn CLI | checkbox add | ✓ | 4.16.1 (local) | manual @radix-ui/react-checkbox install + CLI re-run (EALLOWSCRIPTS workaround) |
| vitest + jsdom + RTL | unit tests | ✓ | 4.1.10 | — |
| tsx | seed runner | ✓ | 4.23.1 | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** shadcn CLI internal install (documented workaround, Pitfall 10).

## Validation Architecture

> **Skipped:** `.planning/config.json` sets `workflow.nyquist_validation: false` explicitly. Phase verification follows the standard UAT/verification flow; the TDD targets below are still recommended because `tdd_mode: true` (Phase 1 precedent).

**Recommended TDD targets (for the planner's plan tasks):**
- `__tests__/booking.test.ts` (NEW): `lib/booking.ts` pure helpers (client-safe, no "server-only") — `depositCents` (3000→750, 2000→500, 4500→1125, 1999→500 rounding), `bookingRef` (`#BK-` + 4 uppercase chars; stable), `toDateKey` (local YYYY-MM-DD, zero-padded), `formatSlotTime` ("09:00"→"9:00 AM", "16:30"→"4:30 PM"), `formatSlotDate` ("2026-08-04"→"Tue, Aug 4").
- `__tests__/validate.test.ts` (EXTEND): `bookingSchema` — accepts `{ slotId: validUuid, deposit: "on" }` → `{ deposit: true }`; accepts absent deposit → `false`; rejects non-uuid slotId; rejects missing slotId.
- `__tests__/mock.test.ts` (EXTEND): `payment.createPayment(..., fakeClient)` routes through `fakeClient.query` (assert called, SQL contains mock_payments, `sql` NOT called); `email.sendEmail({ ..., bookingId })` produces an INSERT including `booking_id` (sqlArgs contains the id); existing no-client tests unchanged.
- Runtime smoke (dev server + real Neon): `npm run seed` twice (idempotent; second run appends the next day's slots only); two concurrent `createBooking` calls on the same slot → exactly one `{ok}`, one conflict message; admin confirm → email row with booking_id; user cancel with deposit → mock_payments status 'refunded' + slot shows free again; `/booking/[id]` renders notices for seeded bookings; guest slot selection → `/login?next=/book`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (inherited) | jose JWT httpOnly cookie + proxy gate — unchanged; actions re-verify `getCurrentUser` |
| V3 Session Management | yes (inherited) | Existing session cookie; no new session surface; SameSite=Lax |
| V4 Access Control | yes | `/admin/bookings` behind proxy + layout auth; owner-scoped cancel (`WHERE b.user_id = $1`); generic stale-booking message (no enumeration); public pages never expose owner actions to guests |
| V5 Input Validation | yes | `bookingSchema` (uuid slotId, deposit boolean preprocess); `isUuid` guards on booking/slot ids; deposit amount computed server-side (never from the client) |
| V6 Cryptography | no | No new crypto; booking refs are display-only derived strings |

### Known Threat Patterns for {Booking stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Double-booking race (two users, same slot) | Tampering | Atomic conditional UPDATE (rowcount) inside withPool + partial unique index `WHERE status <> 'cancelled'` (DB-level backstop); conflict → UI-SPEC message, never 500 |
| IDOR: cancelling someone else's booking | Information Disclosure | Owner cancel scoped `AND b.user_id = ${user.id}` + status + future-slot guards in the same UPDATE; admin cancel is auth-gated (any authenticated session is "admin" in the template's flat model) |
| SQL injection via slotId/bookingId | Tampering | `isUuid` guard before SQL; pg-style `client.query(text, $n)` inside transactions; tagged templates outside; never string-concatenated FormData |
| CSRF on booking/cancel/confirm actions | Spoofing | Inherited: proxy Origin/referer check for non-GET /api/* + SameSite=Lax cookie on server actions |
| Tampered deposit amount | Tampering | Client submits only the `deposit` boolean; amount = `Math.round(price_cents * 0.25)` recomputed server-side from the DB |
| Booking-id enumeration via /booking/[id] | Information Disclosure | Page is shareable BY DESIGN (no sensitive data: name/email of the owner are shown — acceptable demo posture, matches UI-SPEC "shareable confirmation"); mutations are ownership-guarded |
| Refund abuse (double cancel) | Tampering | Cancel UPDATE guarded `WHERE status IN ('pending','confirmed')` → rowcount 0 on repeat cancels → no-op; refund runs only when the guarded update returns a deposit_payment_id |

## Sources

### Primary (HIGH confidence)
- Codebase (verified by direct read): `lib/db.ts` (withPool BEGIN/COMMIT/ROLLBACK, client.query usage), `lib/mock/{email,sms,payment}.ts` (signatures + assertMockMode + cents convention), `db/migrations/001_init.sql` + `002_cms.sql` (conventions: CHECK drop-add pair, unique index vs constraint, `;\n` split rule), `scripts/seed.ts` (ledger runner, upsert patterns, phantom-$n lesson, TABLES report), `app/(main)/posts/actions.ts` (action pattern: {ok} returns, 23505 catch, isUuid, ownership scoping), `app/admin/*` (AdminShell, layout auth, stat cards, emails/sms pages), `lib/validate.ts` (preprocess patterns), `lib/session.ts`, `proxy.ts` (matcher — /services /book /booking public by construction), `lib/utils.ts`, `lib/blog.ts` (client-safe helper model), `lib/site.ts`, `vitest.config.mts`, `__tests__/*` (mock.test.ts stubbing approach)
- [Neon serverless driver official docs](https://neon.tech/docs/serverless/serverless-driver) — fetched 2026-08-02: Pool/Client are node-postgres drop-in compatible (`query(text, params)` with `$n`), HTTP `sql` for one-shots only, interactive transactions require WebSockets, per-request Pool lifecycle, results metadata matches node-postgres (rows/rowCount)
- Phase 1 artifacts: `.planning/phases/01-cms-app/01-01-PLAN.md` + `01-01-SUMMARY.md` + `01-02-SUMMARY.md` (migration/action/seed patterns + the five auto-fixed seed lessons), `.planning/phases/01-cms-app/01-RESEARCH.md` (Validation Architecture skip precedent, Key Decisions format)
- Project-level research: `.planning/research/FEATURES.md` (booking feature set + anti-features), `.planning/research/STACK.md` (transaction section — superseded by CONTEXT-locked conditional UPDATE)

### Secondary (MEDIUM confidence)
- 02-CONTEXT.md + 02-UI-SPEC.md (locked decisions, copy contract, data shapes, seed realism grid)
- npm registry (`npm view @radix-ui/react-checkbox`): 1.3.11, 51.8M/wk, no postinstall; gsd-tools `package-legitimacy check` → SUS (too-new) — flagged for human-verify

### Tertiary (LOW confidence)
- Standard Postgres semantics: partial unique indexes, UPDATE rowcount, `date`/`time` column behavior, `CURRENT_DATE` — standard knowledge, tagged [ASSUMED] (Assumptions Log A1–A3)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps (UI-SPEC locked); all reused libraries verified in-repo; Neon client API verified against official docs
- Architecture: HIGH — every pattern (claim txn, cancel txn, seed window, notice linking, action surface) maps to verified in-repo code or official driver docs
- Pitfalls: MEDIUM — in-repo lessons (phantom $n, EALLOWSCRIPTS, pg types) verified; standard-SQL behaviors (partial index, rowcount) [ASSUMED] but low risk with the documented fallbacks

**Research date:** 2026-08-02
**Valid until:** 2026-09-01 (30 days — stable stack; re-verify @neondatabase/serverless major before then)

---

## Key Decisions for Planner (8-12 items)

1. **`003_booking.sql` migration (plan 02-01, first task):** create `services` (price_cents integer, duration_min), `slots` (slot_date date, slot_time time, booked_at timestamptz, UNIQUE(service_id, slot_date, slot_time), partial calendar index), `bookings` (status CHECK pending/confirmed/cancelled via DROP+ADD pair, price_cents snapshot, deposit_payment_id → mock_payments SET NULL, partial unique index `(slot_id) WHERE status <> 'cancelled'`, user/status indexes); `ALTER TABLE mock_emails/mock_sms ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL` + partial indexes. Update seed TABLES report array.
2. **Slot claim = CONTEXT-locked conditional UPDATE + rowcount** inside `withPool`; rowcount 0 OR 23505 → `{ message: "That slot was just taken." }` (UI-SPEC conflict copy) — never a thrown 500.
3. **Deposit atomicity:** extend `lib/mock/payment.ts` `createPayment`/`refund` with an optional `PoolClient` param (pg-style `client.query` path); call INSIDE the booking transaction; ROLLBACK covers failures. Amount = `Math.round(price_cents * 0.25)` computed server-side.
4. **Notice linking:** extend `email.sendEmail`/`sms.sendSms` with optional `bookingId` (static SQL, nullable param); call AFTER COMMIT; confirmation page queries `mock_emails/mock_sms WHERE booking_id = $1`. Admin confirm sends a confirmation email (UI-SPEC copy implies — Open Question 1).
5. **Seed (plan 02-01 task or 02-02, per wave split):** fixed ids (services `e1/e2/e3`, bookings `f1..f4`, payments `e4…`, notices `a3/a4`, `b3/b4` — hex-only prefixes); WEEKLY_TEMPLATE Tue–Sat 09:00–16:00 hourly; 14-day generation with `toDateKey` + explicit `::date`/`::time` casts + `ON CONFLICT DO NOTHING`; sample bookings upsert RE-POINTS slot_id each run; cancelled booking's slot explicitly `booked_at = NULL`; 2 deposits (one 'succeeded', one 'refunded'); all bookings owned by demo@example.com.
6. **Cancel txn order (shared by user + admin actions):** guarded status UPDATE (owner + future-slot guards for the user path) → race-safe reopen (`NOT EXISTS` other-active-booking guard) → refund via client. Both actions in `app/admin/bookings/actions.ts`-adjacent files per Phase 1 co-location convention.
7. **`lib/booking.ts` pure helpers (TDD):** `depositCents`, `bookingRef`, `toDateKey`, `formatSlotTime`, `formatSlotDate` — client-safe (no "server-only"), locked Intl formats, consumed by slot-picker + confirmation + admin table.
8. **`bookingSchema` in `lib/validate.ts`:** `{ slotId: z.uuid(...), deposit: z.preprocess((v) => v === "on", z.boolean()).default(false) }` + extend mock/validate tests; new `__tests__/booking.test.ts`.
9. **Public routes by proxy construction:** `/services`, `/book` (+`?service=` preselect), `/booking/[id]` — proxy.ts untouched; all `force-dynamic`; guest slot selection → `router.push("/login?next=/book")`; unknown booking id → `notFound()` (cancelled bookings still render).
10. **Admin surface:** `/admin/bookings` page (GET form filters `?status=&service=`, soonest-first ORDER, COUNT twin for "N bookings" line) + AdminShell "Bookings" group + Bookings stat card; actions: `confirmBooking` (pending only, sends notice), `cancelBookingAdmin` (pending/confirmed, no future guard).
11. **UI wiring per UI-SPEC:** `npx shadcn@latest add checkbox` (only install; SUS-flagged @radix-ui/react-checkbox → `checkpoint:human-verify` first; EALLOWSCRIPTS fallback documented); nav "Services" in `lib/site.ts`; 6 new components (`components/booking/*`, `components/admin/booking-filters.tsx`, `bookings-table.tsx`).
12. **Money rule:** integer cents everywhere new (price_cents, deposit amounts); `Number()` only where legacy numeric is read (mock_payments.amount); display via `Intl.NumberFormat` currency on cents/100.
