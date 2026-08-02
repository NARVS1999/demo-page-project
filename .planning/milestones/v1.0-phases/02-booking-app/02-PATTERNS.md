# Phase 2: Booking App — Pattern Map

**Mapped:** 2026-08-02
**Files analyzed:** 22 (14 new + 8 modified)
**Analogs found:** 20 / 22

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `db/migrations/003_booking.sql` | migration | DDL | `db/migrations/002_cms.sql` | exact |
| `lib/booking.ts` | utility | transform | `lib/blog.ts` | exact |
| `__tests__/booking.test.ts` | test | transform | `__tests__/blog.test.ts` | exact |
| `app/(main)/services/page.tsx` (+loading/error) | page (RSC) | CRUD read | `app/(main)/blog/page.tsx` | exact |
| `app/(main)/book/page.tsx` (+loading/error) | page (RSC) | request-response (searchParams) | `app/(main)/blog/search/page.tsx` | exact |
| `app/(main)/book/actions.ts` | server action | request-response + transaction | `app/(main)/posts/actions.ts` + `lib/db.ts` | exact |
| `app/(main)/booking/[id]/page.tsx` (+loading/error/not-found) | page (RSC) | CRUD read | `app/(main)/blog/[slug]/page.tsx` | exact |
| `components/booking/service-card.tsx` | component | request-response | `components/blog/blog-card.tsx` | role-match |
| `components/booking/booking-dialog.tsx` | component (client) | request-response | `components/admin/category-dialog.tsx` | exact |
| `components/booking/slot-picker.tsx` | component (client) | request-response | none (see No Analog Found) | — |
| `components/booking/booking-confirmation.tsx` | component (client) | request-response | `components/blog/blog-card.tsx` (partial) | partial |
| `app/admin/bookings/page.tsx` (+loading/error) | page (admin) | CRUD read + GET filters | `app/admin/categories/page.tsx` + `app/admin/emails/page.tsx` | exact |
| `app/admin/bookings/actions.ts` | server action | CRUD write | `app/(main)/posts/actions.ts` (taxonomy actions) | exact |
| `components/admin/booking-filters.tsx` | component (client) | request-response (GET form) | `components/blog/blog-search.tsx` | exact |
| `components/admin/bookings-table.tsx` | component (client) | CRUD read + write | `components/admin/cms-category-table.tsx` | exact |
| `lib/validate.ts` (modify: +bookingSchema) | config/schema | transform | itself (`postSchema` preprocess lines 40-52) | exact |
| `lib/mock/payment.ts` (modify: +client param) | service (mock) | CRUD write (in-txn) | itself + `lib/db.ts` `withPool` | exact |
| `lib/mock/email.ts` / `lib/mock/sms.ts` (modify: +bookingId) | service (mock) | CRUD write | themselves (sendEmail/sendSms) | exact |
| `scripts/seed.ts` (modify: +services/slots/bookings) | utility (script) | batch upsert | itself (POSTS/MOCK_* upsert loops) | exact |
| `components/layout/admin-shell.tsx` (modify: +Bookings group) | component (layout) | config | itself (`adminNav` array lines 34-76) | exact |
| `app/admin/page.tsx` (modify: +Bookings stat card) | page (admin) | CRUD read | itself (`StatCard` grid lines 49-55) | exact |
| `lib/site.ts` (modify: +Services nav) | config | config | itself (`defaultNav` lines 12-17) | exact |

**Unchanged this phase (verify in plan):** `proxy.ts` (matcher already excludes /services, /book, /booking — lines 68-69), `app/(main)/layout.tsx` (AppShell wraps new pages automatically).

---

## Pattern Assignments

### `db/migrations/003_booking.sql` (migration, DDL)

**Analog:** `db/migrations/002_cms.sql`

**Header + idempotency convention** (lines 1-6):
```sql
-- 002_cms.sql — Phase 1 CMS schema (idempotent; applied by npm run seed)
-- ...
-- Every statement ends with ';' + newline (the seed runner splits on ";\n").
```
Every statement `IF [NOT] EXISTS`-guarded, `;\n` terminated. Table order: dependencies first.

**CHECK constraint DROP-then-ADD pair** (lines 30-32 — the Phase 1 lesson; `ADD CONSTRAINT` has no `IF NOT EXISTS`):
```sql
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts ADD CONSTRAINT posts_status_check CHECK (status IN ('draft', 'published'));
```
→ Apply the same pair for `bookings_status_check` (`pending/confirmed/cancelled`).

**Additive nullable column on existing table** (lines 28, 36, 38 — use for `booking_id` on mock_emails/mock_sms):
```sql
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
```

**Partial index style** (line 67 — use for `bookings_active_slot_idx ... WHERE status <> 'cancelled'` and `slots_calendar_idx ... WHERE booked_at IS NULL`):
```sql
CREATE INDEX IF NOT EXISTS posts_published_idx ON posts (published_at DESC) WHERE status = 'published';
```

---

### `lib/booking.ts` (utility, transform)

**Analog:** `lib/blog.ts`

**Module contract** (lines 1-4) — client-safe, NO `import "server-only"` (browser + server + tests import it):
```typescript
// lib/blog.ts — client-safe pure helpers (NO "server-only" — imported by the
// browser editor-shell for slugify/parseTags, by public pages for
// readingTime/excerpt, and by /blog/search for escapeLike).
// All five helpers are pure and side-effect free (TDD target).
```

**Helper shape** (lines 16-18 — `lib/booking.ts` gets `bookingRef` (`#BK-` + uuid slice), `depositCents` (`Math.round(price_cents * 0.25)`), `toDateKey`, `formatSlotDate`/`formatSlotTime`):
```typescript
/** Neutralize ILIKE wildcards (% _ \) — ILIKE's default escape char is backslash. */
export function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, "\\$&");
}
```
Locked Intl formats (UI-SPEC): `Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" })` → "Tue, Aug 4"; `{ hour: "numeric", minute: "2-digit" }` → "9:30 AM". One helper each, no ad-hoc formats. Server returns `to_char(s.slot_time, 'HH24:MI')` → helper parses "HH:MM" → Intl.

---

### `__tests__/booking.test.ts` (test, transform)

**Analog:** `__tests__/blog.test.ts`

**Structure** (lines 1-13) — plain vitest `describe`/`it`/`expect`, imports the pure helper via `@/` alias, no mocking needed:
```typescript
// Pure helper unit tests (TDD target — RESEARCH Validation Architecture).
// lib/blog.ts is client-safe by contract (NO "server-only")...
import { describe, expect, it } from "vitest";
import {
  escapeLike,
  excerpt,
  parseTags,
  readingTime,
  slugify,
} from "@/lib/blog";
```
Tests target: `bookingRef` format, `depositCents` rounding (e.g. 3000 → 750; 4500 → 1125), `toDateKey` zero-padding, `formatSlotTime` "09:00" → "9:00 AM" / "16:00" → "4:00 PM". Test helper is pure → exact blog.test.ts pattern.

---

### `app/(main)/services/page.tsx` (page RSC, CRUD read — public)

**Analog:** `app/(main)/blog/page.tsx`

**Public-by-construction + force-dynamic + single query** (lines 6-13):
```typescript
// /blog — public Features grid of published posts (UI-SPEC Page 1).
// Public by construction (proxy matcher excludes /blog); force-dynamic;
// single round-trip query (no N+1)...
import { sql } from "@/lib/db";
import { BlogCard, type BlogPostCard } from "@/components/blog/blog-card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const rows = await sql`SELECT ... FROM posts p ... WHERE p.status = 'published' ORDER BY ...`;
```

**Rows → typed props → grid + EmptyState** (lines 32-41, 58-79):
```typescript
  const posts: BlogPostCard[] = rows.map((row) => ({ title: row.title, slug: row.slug, ... }));
  return (
    <div className="flex flex-col gap-8">
      {posts.length === 0 ? (
        <EmptyState icon={<Newspaper .../>} title="No stories yet" description="..." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => <BlogCard post={post} />)}
        </div>
      )}
    </div>
  );
```
`/services` query: `SELECT id, slug, name, description, price_cents, duration_min FROM services ORDER BY name`. `loading.tsx`/`error.tsx` siblings copy `app/(main)/blog/loading.tsx` / `error.tsx` (skeleton + error-state wrappers).

---

### `app/(main)/book/page.tsx` (page RSC, request-response with searchParams)

**Analog:** `app/(main)/blog/search/page.tsx` (searchParams) + `app/(main)/blog/page.tsx` (layout)

**searchParams-as-Promise contract** (lines 18-24 — `/book?service={slug}` reads the service slug; no redirect needed):
```typescript
export const dynamic = "force-dynamic";

export default async function BlogSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
```

**Availability query shape** (RESEARCH Pattern 5 — `LEFT JOIN bookings WHERE status <> 'cancelled'`, window `CURRENT_DATE..+13`, `to_char` for HH:MI; server groups into `days[]` for slot-picker):
```sql
SELECT s.id, to_char(s.slot_time, 'HH24:MI') AS slot_time, s.slot_date::text AS slot_date,
       (b.id IS NOT NULL) AS taken
FROM slots s
LEFT JOIN bookings b ON b.slot_id = s.id AND b.status <> 'cancelled'
WHERE s.service_id = ${serviceId}
  AND s.slot_date >= CURRENT_DATE AND s.slot_date <= CURRENT_DATE + 13
ORDER BY s.slot_date, s.slot_time;
```

---

### `app/(main)/book/actions.ts` (server action, transaction) — THE CORE FILE

**Analog:** `app/(main)/posts/actions.ts` (FormState/auth/validation skeleton) + `lib/db.ts` `withPool` (transaction) — RESEARCH Code Example §atomic booking action is the authoritative shape; excerpt pointers below.

**FormState type + "use server" + getCurrentUser re-check** (posts/actions.ts lines 13, 24-28, 62-63):
```typescript
"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { flattenError } from "zod";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isUuid } from "@/lib/utils";
import { categorySchema, postSchema, tagSchema } from "@/lib/validate";

type FormState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  ok?: boolean;
};
// in each action:
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/posts/new");
```

**SafeParse + flattenError return** (lines 65-68):
```typescript
  const parsed = parsePost(formData);
  if (!parsed.success) {
    return { errors: flattenError(parsed.error).fieldErrors };
  }
```

**23505 catch → user copy, never a 500** (lines 81-86 — the model for the partial-index belt-and-braces catch in createBooking):
```typescript
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { message: "A post with this slug already exists." };
    }
    throw error;
  }
```

**`{ok:true}` + revalidatePath return** (lines 88-89 — `createBooking` additionally returns `{ok: true, bookingId}` so the dialog can `router.push(`/booking/${id}`)` after the toast; `redirect()` would discard the return value):
```typescript
  revalidatePath("/posts");
  return { ok: true };
```

**withPool transaction — the locked atomic claim** (lib/db.ts lines 23-44; ALL SQL inside must be `client.query(text, $n params)` — pg-style, NOT the `sql` tagged template; `BookingConflictError` branch maps rowCount 0 → `{ message: "That slot was just taken." }`):
```typescript
export async function withPool<T>(
  fn: (client: import("@neondatabase/serverless").PoolClient) => Promise<T>,
): Promise<T> {
  const { Pool } = await import("@neondatabase/serverless");
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
```
Inside: (1) SELECT price_cents → (2) `client.query(`UPDATE slots SET booked_at = now() WHERE id = $1 AND booked_at IS NULL`, [slotId])` → `rowCount === 0` → conflict → (3) `payment.createPayment({amount, currency}, client)` if deposit → (4) `INSERT INTO bookings ... RETURNING id`. POST-COMMIT: `email.sendEmail({..., bookingId})` + `sms.sendSms({..., bookingId})` (module-level `sql` fine — mock never fails). Cancel action: UPDATE bookings FROM slots + race-safe reopen with `NOT EXISTS` guard + `payment.refund(id, client)` (RESEARCH Code Example §cancel transaction).

---

### `app/(main)/booking/[id]/page.tsx` (page RSC, CRUD read — public, shareable)

**Analog:** `app/(main)/blog/[slug]/page.tsx`

**Dynamic segment + notFound for unknown/unauthorized ids** (lines 6, 19-24, 41):
```typescript
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  ...
  if (rows.length === 0) notFound();
  const post = rows[0];
```
`/booking/[id]` adds an `isUuid(id)` guard before SQL (IN-01: non-UUID → same notFound, see `lib/utils.ts` lines 18-25). Data: one `Promise.all` of 3 queries (booking⋈slots⋈services⋈users⋈mock_payments; `mock_emails WHERE booking_id = $1`; `mock_sms WHERE booking_id = $1` — RESEARCH Code Example §confirmation page). Ownership: `canCancel = isOwner && status in (pending,confirmed) && slot in future` — computed server-side; NOT an auth gate (page is public).

---

### `components/booking/booking-dialog.tsx` (client, dialog + server action)

**Analog:** `components/admin/category-dialog.tsx` — the exact client-dialog-over-server-action pattern.

**useActionState + toast + router.refresh + deferred close** (lines 38-51):
```typescript
  const router = useRouter();
  const [state, formAction, pending] = useActionState(boundAction, null);

  React.useEffect(() => {
    if (!state?.ok) return;
    toast.success(mode === "create" ? "Category created." : "Category renamed.");
    // Deferred close keeps the compiler rule happy (no sync setState in
    // effects) while matching the old immediate-close behavior.
    const timer = setTimeout(() => setOpen(false), 0);
    router.refresh();
    return () => clearTimeout(timer);
  }, [state, mode, router]);
```
booking-dialog: on `state.ok` → `toast.success` → `router.push(`/booking/${state.bookingId}`)` (navigation REPLACES router.refresh). `state?.message` renders a destructive Alert (lines 70-74) — the "That slot was just taken." conflict copy; `state?.errors?.*` render inline `text-destructive` paragraphs (lines 86-90).

**Checkbox field** (Pitfall 6 — unchecked box submits nothing; use `z.preprocess((v) => v === "on", z.boolean()).default(false)` in bookingSchema; checkbox is the ONLY new shadcn component, `npx shadcn@latest add checkbox`).

---

### `components/booking/service-card.tsx` (component)

**Analog:** `components/blog/blog-card.tsx` (role-match). Server-renderable card receiving typed props; uses `Card` primitives + price/duration display. Price formatting: cents → dollars via `(price_cents / 100).toFixed(2)` (never raw `numeric` — always integer cents per RESEARCH).

---

### `components/admin/booking-filters.tsx` (client, GET form)

**Analog:** `components/blog/blog-search.tsx` — plain GET form to a server-rendered page, no client fetch, no debounce.

```typescript
export function BlogSearch({ defaultValue }: { defaultValue?: string }) {
  return (
    <form method="GET" action="/blog/search" className="w-full sm:w-64" role="search">
      <input type="search" name="q" defaultValue={defaultValue} ... />
    </form>
  );
}
```
booking-filters: `form method="GET" action="/admin/bookings"` with two controls — `select name="status"` (all|pending|confirmed|cancelled) and `select name="service"` (all|{slug}); defaultValue from `searchParams`. Selects use `components/ui/select` or native `<select>`; keep GET semantics.

---

### `components/admin/bookings-table.tsx` (client, table with confirm/cancel actions)

**Analog:** `components/admin/cms-category-table.tsx` — the exact client table + per-row destructive-confirm pattern.

**Table + row hover + actions column** (lines 155-225): `overflow-x-auto` wrapper, `min-w-[560px] w-full` table, `hover:bg-muted/50` rows, `DropdownMenu` with `DropdownMenuItem onSelect={(e) => e.preventDefault()}` for in-menu dialogs.

**Radix AlertDialog form-submit fix** (lines 46-108 — REQUIRED for confirm/cancel: AlertDialogAction auto-closes before implicit form submission; intercept + `formRef.current?.requestSubmit()`; own `useActionState` per row):
```typescript
      <AlertDialogAction
        type="submit"
        disabled={pending}
        onClick={(event) => {
          event.preventDefault();
          formRef.current?.requestSubmit();
        }}
        className="bg-destructive text-white hover:bg-destructive/90"
      >
        {pending ? "Deleting…" : "Delete"}
      </AlertDialogAction>
```
Skeleton variant (lines 119-132) and EmptyState branch (lines 134-153) also copy from this file. Confirm uses the same pattern with non-destructive styling. Table row type `BookingRow` mirrors `CategoryRow` (lines 36-42).

---

### `app/admin/bookings/page.tsx` (admin page, CRUD read + GET filters)

**Analog:** `app/admin/categories/page.tsx` (section skeleton) + `app/admin/emails/page.tsx` (table rendering)

**Section page skeleton** (categories/page.tsx lines 14-29):
```typescript
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/categories");

  const rows = (await sql`SELECT ... ORDER BY ...`) as {...}[];

  const categories: CategoryRow[] = rows.map((row) => ({ ... }));
```
Auth comes free from `app/admin/layout.tsx` (lines 6-16 — `getCurrentUser` + `redirect("/login?next=/admin")` + AdminShell wrapper); pages still re-check per convention. Filters: read `searchParams` (Promise) for `?status=` / `?service=`, build the join query (`bookings ⋈ slots ⋈ services ⋈ users ⋈ mock_payments`, `ORDER BY s.slot_date, s.slot_time`), `COUNT(*)` twin for the "N bookings" line. Table markup pattern from emails/page.tsx lines 45-77 (`rounded-xl border` wrapper, `min-w-[640px] w-full` table, `Badge variant="secondary"` status cells).

---

### `app/admin/bookings/actions.ts` (admin server actions)

**Analog:** `app/(main)/posts/actions.ts` taxonomy actions (`createCategory`/`renameCategory`/`deleteCategory` lines 165-247).

**Action shape** (lines 169-191) — same FormState skeleton as book/actions.ts; admin variants omit the owner WHERE clause and the "upcoming" guard:
```typescript
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/categories");

  const id = formData.get("id");
  if (typeof id !== "string" || !isUuid(id)) {
    return { message: "This category no longer exists." };
  }
  ...
  revalidatePath("/admin/categories");
  return { ok: true };
```
`confirmBooking` / `cancelBookingAdmin` wrap the shared cancel/confirm transaction (withPool + `client.query`), `revalidatePath("/admin/bookings")` + `revalidatePath("/book")`. Confirm sends notice via `email.sendEmail({..., bookingId})` post-COMMIT. Generic "This booking no longer exists." for rowCount 0 (anti-enumeration, same as posts).

---

### `lib/validate.ts` (modify: +bookingSchema)

**Analog:** itself — `postSchema` preprocess conventions (lines 40-52).

**Checkbox preprocess** (Pitfall 6 — model on the categoryId pattern, line 48):
```typescript
  categoryId: z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable().optional()),
```
`bookingSchema`: `slotId: z.uuid()` (postSchema line 48 precedent), `deposit: z.preprocess((v) => v === "on", z.boolean()).default(false)`. Client-safe module — no env, no server-only (line 4-7 contract).

---

### `lib/mock/payment.ts` / `lib/mock/email.ts` / `lib/mock/sms.ts` (modify: optional params)

**Analog:** themselves — backwards-compatible optional params so existing call sites + `__tests__/mock.test.ts` pass unchanged (RESEARCH Pattern 3).

**payment.ts — optional PoolClient** (current lines 14-29; add `client?` param; when present use `client.query(text, $n)` instead of `sql` tagged template):
```typescript
import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";

export async function createPayment({
  amount,
  currency = "usd",
  fail = false,
}: {
  amount: number;
  currency?: string;
  fail?: boolean;
}) {
  assertMockMode();
  const id = randomUUID();
  const status = fail ? "failed" : "succeeded";
  await sql`INSERT INTO mock_payments (id, amount, currency, status)
    VALUES (${id}, ${amount}, ${currency}, ${status})`;
  return { id, status: status as "succeeded" | "failed", amount, currency };
}
```
Add second param `client?: import("@neondatabase/serverless").PoolClient` and branch the INSERT (client → `client.query(`INSERT ... VALUES ($1,$2,$3,$4)`, [id, amount, currency, status])`). Same for `refund(id)` → `refund(id, client?)`. email.ts line 13-27 / sms.ts line 13-19: add optional `bookingId?: string` to the destructured args; INSERT gains the column with `${bookingId ?? null}` (nullable column added by 003_booking.sql). Keep `assertMockMode()` (lines 8-12) untouched. Barrel `lib/mock/index.ts` unchanged — imports stay `import { payment, email, sms } from "@/lib/mock"`.

---

### `scripts/seed.ts` (modify: services, slots, bookings)

**Analog:** itself — fixed-UUID-prefix data arrays + ON CONFLICT upsert loops + TABLES report.

**Fixed UUID prefixes per table** (lines 156-216 — services use `e1…e3`, bookings `f1…f4`, payments `e4…`, emails `a3…`, sms `b3…`; never reuse c/d/a/b prefixes):
```typescript
const CATEGORIES = [
  { id: "c1111111-1111-4111-8111-111111111111", slug: "template-guide", name: "Template Guide" },
  ...
];
```

**Upsert loop with subselect FK** (lines 244-256 — sample bookings re-point `slot_id` into the rolling window each run via subselect on (slug, date, time); `ON CONFLICT (id) DO UPDATE`):
```typescript
    await sqlDirect`
      INSERT INTO posts (id, title, content, status, slug, category_id, ...)
      VALUES (${post.id}, ..., (SELECT id FROM categories WHERE slug = ${post.categorySlug}), ...)
      ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title, ... , updated_at = now()`;
```

**Slot generation** (RESEARCH Pattern 4): `WEEKLY_TEMPLATE` Record<dayOfWeek, times[]>; loop `offset 0..13`, `toDateKey(day)` computed in JS, explicit `::date`/`::time` casts, `ON CONFLICT (service_id, slot_date, slot_time) DO NOTHING` (avoids Pitfall 8 phantom `$n`). Booked marks: non-cancelled → `UPDATE slots SET booked_at = now() WHERE id = ${slotId}`; cancelled → `SET booked_at = NULL` (reopen rule demo). Migration runner (lines 35-94) untouched — `003_booking.sql` is picked up automatically by `readdir("db/migrations")` sort.

**TABLES report array** (lines 289-300 — add `services`, `slots`, `bookings`):
```typescript
const TABLES = [
  "schema_migrations",
  "users",
  "posts",
  "categories",
  "tags",
  "post_tags",
  "mock_payments",
  "mock_emails",
  "mock_sms",
  "mock_uploads",
];
```

---

### Shell/nav/stat-card modifications (all analog = the file itself)

**`components/layout/admin-shell.tsx`** — add a third group below "Content" (lines 34-76): `{ group: "Bookings", items: [{ label: "Bookings", href: "/admin/bookings", icon: <CalendarCheck className="h-4 w-4" aria-hidden="true" /> }] }` — mirror the existing group object shape exactly (lucide icon with `aria-hidden`).

**`app/admin/page.tsx`** — add one `StatCard` to the grid (lines 49-55): `const bookingRows` added to the existing `Promise.all` (lines 26-35), `icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />}` → 6 cards (grid `md:grid-cols-3` still fits).

**`lib/site.ts`** — insert into `defaultNav` after Blog (lines 12-17): `{ label: "Services", href: "/services" }`. Do NOT bump TEMPLATE_VERSION (this is an additive app feature, not a template fork).

---

## Shared Patterns

### Server Action Skeleton (all 4 action files)
**Source:** `app/(main)/posts/actions.ts` lines 13-28, 62-68, 81-90
**Apply to:** `book/actions.ts`, `admin/bookings/actions.ts`
`"use server"` → `FormState = { errors?, message?, ok? }` → `getCurrentUser()` + `redirect("/login?next=...")` → `schema.safeParse(formData)` → `flattenError(parsed.error).fieldErrors` on failure → try/catch with `23505` → `revalidatePath` + `return { ok: true }`. `createBooking` additionally returns `bookingId` for client navigation.

### Auth guard (no new code — reuse)
**Source:** `proxy.ts` lines 68-69 (matcher) + `app/admin/layout.tsx` lines 6-16
**Apply to:** all new pages. `/services`, `/book`, `/booking/[id]` are NOT in the matcher → public by construction. `/admin/bookings` inherits the layout guard + AdminShell. Every action still re-checks `getCurrentUser`.

### withPool transaction discipline (bookings + mock extensions)
**Source:** `lib/db.ts` lines 23-44
**Apply to:** `createBooking`, `cancelBooking`, `cancelBookingAdmin`, `confirmBooking`, `payment.createPayment/refund(client?)`
Inside the callback: pg-style `client.query(text, $n params)` ONLY — the `sql` tagged template is HTTP-only and must never appear in a transaction (Pitfall 5). Mock deposit runs INSIDE the txn via the `client` param (Pitfall 3).

### Validation & id guards
**Source:** `lib/validate.ts` (preprocess lines 44-51), `lib/utils.ts` `isUuid` lines 18-25
**Apply to:** all actions. Every `slotId`/`bookingId` param: `isUuid` check → generic "no longer exists"/"just taken" copy before SQL (IN-01). Deposit checkbox: `z.preprocess((v) => v === "on", z.boolean()).default(false)`.

### Client mutation feedback loop (dialogs/tables)
**Source:** `components/admin/category-dialog.tsx` lines 38-51, `components/admin/cms-category-table.tsx` lines 46-108
**Apply to:** `booking-dialog.tsx`, `bookings-table.tsx`, `booking-confirmation.tsx`
`useActionState` → on `ok`: toast + refresh-or-push (deferred `setTimeout(0)` close); `message` → destructive Alert; `errors` → inline field errors; AlertDialog confirm intercepts click + `requestSubmit()`.

### Error handling (pages)
**Source:** `app/(main)/blog/error.tsx` / `loading.tsx` siblings
**Apply to:** every new route folder — `loading.tsx` (skeleton via `components/ui/skeleton`), `error.tsx` (`error-state` component), `not-found.tsx` for `/booking/[id]`. `export const dynamic = "force-dynamic"` on every DB-reading page (AGENTS.md hard rule).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `components/booking/slot-picker.tsx` | component (client) | request-response | No interactive slot-selection component exists. Build from: `booking-dialog` interaction conventions (useActionState not needed — pure client state), `components/ui/select`, `Badge` availability pills; server passes grouped `days[]` props; taken-state disables pills (per UI-SPEC). Planner should lean on UI-SPEC + `components/blog/tag-chip.tsx` for pill styling precedent. |
| `components/booking/booking-confirmation.tsx` | component (client) | request-response | No receipt/notice-listing component. Reuse `Card` + `Badge` + `EmptyState` primitives and the date-fmt helper pattern from `app/admin/emails/page.tsx` lines 13, 57-73 (list of notices). |

## Metadata

**Analog search scope:** `app/`, `components/`, `lib/`, `db/migrations/`, `scripts/`, `__tests__/`, `proxy.ts` (full repo scan; 10 files read in depth)
**Files scanned:** ~60 (glob) / 22 read
**Pattern extraction date:** 2026-08-02
**Key verification notes:** `withPool` (lib/db.ts) confirmed BEGIN/COMMIT/ROLLBACK + release/end in finally; mock services confirmed module-level `sql` (client param is a required backwards-compatible extension); `002_cms.sql` confirmed DROP-then-ADD constraint pair + `IF NOT EXISTS` discipline; seed confirmed `readdir` auto-discovery of new migration files.
