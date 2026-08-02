// npm run seed — migrations + idempotent demo data + size report.
// Self-contained on purpose: does NOT import lib/* modules (they carry
// "server-only", which throws outside Next) — the ONE exception is the
// client-safe pure helper toDateKey from lib/booking.ts (no server-only,
// no env). Uses sqlDirect (direct URL) for migrations per Neon docs; pooler
// URL is for the app only.
//
// Order: (1) load env → (2) run pending migrations → (3) upsert demo data →
// (4) report per-table counts + total size; exit(1) at >= 200 MB (hard gate).

import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { toDateKey } from "@/lib/booking";

// ─── 1. Load env (Pitfall 4: Next does not load .env.local for scripts) ─────
if (existsSync(".env.local")) {
  try {
    process.loadEnvFile(".env.local");
  } catch (error) {
    console.error("Failed to load .env.local:", error);
    process.exit(1);
  }
} else {
  console.error("Missing .env.local — copy .env.example and fill the two Neon URLs.");
  process.exit(1);
}

if (!process.env.DATABASE_URL_DIRECT) {
  console.error("DATABASE_URL_DIRECT is missing — seed requires the DIRECT (non-pooler) URL.");
  process.exit(1);
}

const sqlDirect = neon(process.env.DATABASE_URL_DIRECT);

// ─── 2. Migrations ───────────────────────────────────────────────────────────
async function runMigrations() {
  // Bootstrap the ledger before checking it (fresh DBs lack schema_migrations).
  await sqlDirect.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  const files = (await readdir("db/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    const applied = await sqlDirect`SELECT 1 FROM schema_migrations WHERE version = ${version}`;
    if (applied.length > 0) {
      console.log(`  · ${version} — already applied, skipping`);
      continue;
    }

    const sql = await readFile(`db/migrations/${file}`, "utf8");
    try {
      // Raw DDL from a trusted migration file — query() executes SQL text
      // without parameterization.
      await sqlDirect.query(sql);
    } catch (error) {
      // The driver rejects multi-statement payloads ("cannot insert multiple
      // commands into a prepared statement") — ONLY that failure falls back to
      // executing statement-by-statement. Any other error (a genuine SQL error
      // in a future migration) is re-thrown so the real message surfaces
      // (IN-02 — previously `void error` swallowed it, which could leave
      // partially applied DDL with no ledger entry). Split on ";\n" (NOT bare
      // ";") so semicolons inside single-line comments (e.g.
      // "-- (idempotent; applied by …)") never cut mid-comment. DDL-only
      // migrations make this safe.
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("multiple commands")) {
        throw new Error(`Migration ${version} failed: ${message}`, { cause: error });
      }
      const statements = sql
        .split(/;\s*\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      try {
        for (const statement of statements) {
          await sqlDirect.query(statement);
        }
      } catch (statementError) {
        // Preserve the original multi-statement rejection as the cause so the
        // root failure is never lost (IN-02).
        throw new Error(
          `Migration ${version} failed at statement: ${statementError instanceof Error ? statementError.message : String(statementError)}`,
          { cause: error },
        );
      }
    }

    await sqlDirect`INSERT INTO schema_migrations (version) VALUES (${version}) ON CONFLICT DO NOTHING`;
    console.log(`  · ${version} — applied`);
  }
}

// ─── 3. Demo data upserts (idempotent; fixed IDs make re-runs deterministic) ─
const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

// 5 published posts, staggered published_at, picsum covers, hardcoded
// kebab-case slugs, category + tags assignments. Content exercises the
// markdown typography set (h2/h3, lists, code, blockquotes, links, tables) and
// never relies on raw HTML (react-markdown escapes it — UI-SPEC security note).
const POSTS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Template Guide — build your next app in minutes",
    slug: "template-guide-build-your-next-app-in-minutes",
    categorySlug: "template-guide",
    tagSlugs: ["next-js", "neon", "vercel", "auth"],
    daysAgo: 30,
    content:
      "This template ships the fullstack essentials: email/password auth with a signed JWT in an httpOnly cookie, raw-SQL data access against Neon, six pluggable mock services, and a reference Posts CRUD.\n\n## Fork it in three steps\n\n1. Copy the repo\n2. Bump `TEMPLATE_VERSION` in `lib/site.ts`\n3. Run `npm run seed` and `npm run dev`\n\nEverything — auth, mocks, admin views — works against the seeded demo account.\n\n> Stick to the conventions in `AGENTS.md`: proxy.ts (not middleware.ts), force-dynamic on every DB-reading page, and bcrypt only inside route handlers.\n\n### The stack at a glance\n\n| Layer | Choice | Why |\n| ----- | ------ | --- |\n| Framework | Next.js 16 (App Router) | Server-first, streaming, one deployment |\n| Data | Neon Postgres via raw SQL | Zero ORM, zero magic |\n| Auth | jose JWT in an httpOnly cookie | Small, auditable, no sessions table |\n\n## What ships out of the box\n\n- **Auth** — register/login/logout with bcrypt hashing and a signed session cookie\n- **Mocks** — payments, email, SMS, OAuth, maps, storage, all inspectable under /admin\n- **Blog** — this phase: markdown editor, live preview, categories, tags, search\n\nSee [the deployment walkthrough](/blog/deploy-walkthrough-vercel-neon-at-0) for the $0 hosting story.",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Mock Services — how the demo layer works",
    slug: "mock-services-how-the-demo-layer-works",
    categorySlug: "mock-services",
    tagSlugs: ["mock-services"],
    daysAgo: 21,
    content:
      "Every demo needs third-party services (payments, email, SMS, OAuth, maps, storage) — none of which should be called for real in a template. Each mock mirrors the real provider's interface and persists its events to a `mock_*` table you can inspect under /admin.\n\n## Switching providers without touching call sites\n\n```ts\nimport { payment, email, sms } from \"@/lib/mock\";\n\nawait payment.createPayment({ amount: 4999, currency: \"usd\" });\nawait email.send({ recipient, subject, body });\n```\n\nThe import surface never changes. Swapping a mock for a real provider replaces one file per service — call sites stay identical.\n\n## Demo failure paths on demand\n\nSet `MOCK_PAYMENT=mock` (the default) for the in-process simulation. `createPayment` accepts a `fail: true` option so you can demo failure paths on demand:\n\n- `fail: true` → a `payment_failed` event with a declined-card message\n- success → a `succeeded` event, inspectable in the admin activity feed\n\nThe `\"real\"` value is reserved for future apps that wire actual providers.\n\n### What each mock table records\n\n- `mock_payments` — amount, currency, status\n- `mock_emails` — recipient, subject, body, status\n- `mock_sms` — recipient, message, status\n- `mock_uploads` — name, url, size_bytes (metadata only — never the blob)",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Deploy Walkthrough — Vercel + Neon at $0",
    slug: "deploy-walkthrough-vercel-neon-at-0",
    categorySlug: "deployment",
    tagSlugs: ["vercel", "neon"],
    daysAgo: 14,
    content:
      "The template is built to stay on free tiers: Vercel Hobby (1M function invocations/month, account-wide) and Neon (0.5 GB per project). The seed enforces a hard size gate at 200 MB so demo data can never eat the budget.\n\n## Deploy in four steps\n\n1. Push the repo to GitHub\n2. Import it in Vercel\n3. Paste the 9 env vars from `.env.example` (both Neon URLs from the Connect modal — pooled for the app, direct for migrations)\n4. Push to main\n\n> The first visit may take a few seconds while Neon wakes from cold storage.\n\n### Env contract\n\n```bash\nDATABASE_URL=postgresql://...-pooler.aws.neon.tech/db   # app reads\nDATABASE_URL_DIRECT=postgresql://...aws.neon.tech/db    # migrations/seed\nSESSION_SECRET=at-least-32-characters                   # jose HMAC key\nMOCK_PAYMENT=mock\nMOCK_EMAIL=mock\nMOCK_SMS=mock\nMOCK_OAUTH=mock\nMOCK_MAPS=mock\nMOCK_STORAGE=mock\n```\n\n## Why the two URLs?\n\nNeon's pooled endpoint (the `-pooler` host) keeps serverless connections warm and within the free-tier limit; the direct endpoint bypasses the pooler for one-off scripts like `npm run seed`. Mixing them up is the most common setup mistake — the seed exits early with a clear message if the direct URL is missing.",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    title: "The Nature Theme — how the newspaper look works",
    slug: "the-nature-theme-how-the-newspaper-look-works",
    categorySlug: "design",
    tagSlugs: ["design", "markdown"],
    daysAgo: 7,
    content:
      "This blog is styled like a newspaper's Features section: serif reading type, a drop cap on the first paragraph, kicker labels above headlines, and column hairlines between grid cards.\n\n## The ingredients\n\n- **Serif body** — Newsreader for headings and body copy, with a mono (IBM Plex Mono) dateline for contrast\n- **Drop cap** — the first letter of the first paragraph scales up and floats left, but only when the article opens with a paragraph\n- **Kickers** — category badges and section labels are mono, uppercase, with a double-underline rule in the primary color\n- **Hairlines** — `1px` rules in muted tones separate grid columns instead of card borders\n\n### Where the tokens live\n\n```css\n.article-body > p:first-child::first-letter {\n  float: left;\n  margin-right: 0.5rem;\n  font-size: 3rem;\n  font-weight: bold;\n  color: var(--primary);\n  line-height: 0.8;\n}\n```\n\nEvery typography rule is scoped under `.article-body` — nothing leaks into the admin area.\n\n## Why markdown, not a rich-text editor\n\nRaw markdown is portable, diffable, and safe: react-markdown escapes any raw HTML in post content, so a pasted `<script>` tag renders as plain text, never as markup. The editor preview and the published article share one component map and one CSS class — what you write is exactly what readers see.",
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    title: "Posts CRUD — from blank form to published story",
    slug: "posts-crud-from-blank-form-to-published-story",
    categorySlug: "template-guide",
    tagSlugs: ["next-js", "markdown"],
    daysAgo: 3,
    content:
      "The posts area is the template's reference CRUD: create, read, update, delete, plus a draft/publish workflow and — new in this phase — categories, tags, and cover images.\n\n## The write path\n\n1. **Editor** — the markdown editor with a live preview pane. The slug auto-derives from the title (edit it to customize)\n2. **Server action** — `createPost` validates the form with Zod, derives a fallback slug, and catches duplicate-slug violations\n3. **Database** — one INSERT with `RETURNING id`, then the tag joins are deleted and re-inserted\n4. **Public page** — only posts with `status = 'published'` ever render on /blog\n\n### Drafts stay private\n\n```sql\n-- every public query hard-filters on status\nWHERE p.status = 'published'\n```\n\nA draft's slug returns the same 404 as an unknown slug — guests can't tell it exists.\n\n## Try it yourself\n\nCreate a post, save it as a draft, and confirm it stays off the public blog. Then publish it and watch it appear at the top of the Features grid with its reading time, kicker, and dateline.",
  },
];

// Fixed UUIDs follow the existing deterministic pattern (categories/tags use
// their own prefixes so ids never collide across tables).
const CATEGORIES = [
  { id: "c1111111-1111-4111-8111-111111111111", slug: "template-guide", name: "Template Guide" },
  { id: "c2222222-2222-4222-8222-222222222222", slug: "mock-services", name: "Mock Services" },
  { id: "c3333333-3333-4333-8333-333333333333", slug: "deployment", name: "Deployment" },
  { id: "c4444444-4444-4444-8444-444444444444", slug: "design", name: "Design" },
];

const TAGS = [
  { id: "d1111111-1111-4111-8111-111111111111", slug: "next-js", name: "Next.js" },
  { id: "d2222222-2222-4222-8222-222222222222", slug: "neon", name: "Neon" },
  { id: "d3333333-3333-4333-8333-333333333333", slug: "vercel", name: "Vercel" },
  { id: "d4444444-4444-4444-8444-444444444444", slug: "mock-services", name: "Mock services" },
  { id: "d5555555-5555-4555-8555-555555555555", slug: "markdown", name: "Markdown" },
  { id: "d6666666-6666-4666-8666-666666666666", slug: "design", name: "Design" },
  { id: "d7777777-7777-4777-8777-777777777777", slug: "auth", name: "Auth" },
];

const MOCK_EMAILS = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    recipient: "demo@example.com",
    subject: "Welcome to nextjs-starter",
    body: "Thanks for signing up. This is a mock email persisted to mock_emails.",
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    recipient: "demo@example.com",
    subject: "Your invoice is ready",
    body: "Invoice #0042 for $49.00 is ready to view (mock event).",
  },
];

const MOCK_SMS = [
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
    recipient: "+15551234567",
    message: "Your verification code is 482913 (mock SMS).",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
    recipient: "+15551234567",
    message: "Order #0017 shipped — track it in the demo dashboard (mock).",
  },
];

const MOCK_PAYMENTS = [
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
    amount: 4999,
    currency: "usd",
    status: "succeeded",
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc2",
    amount: 100,
    currency: "usd",
    status: "failed",
  },
];

// ─── Phase 2: barber-shop booking domain (CONTEXT: Demo Data & Domain) ───────
// Fixed ids use fresh prefixes (e1-e4, f, a3, b3) — never reuse c/d/a/b.

// 3 services, exact UI-SPEC pricing/durations. Upsert keyed on slug.
const SERVICES = [
  {
    id: "e1111111-1111-4111-8111-111111111111",
    slug: "haircut",
    name: "Haircut",
    description: "Classic cut, hot towel finish, and style.",
    priceCents: 3000,
    durationMin: 30,
  },
  {
    id: "e2222222-2222-4222-8222-222222222222",
    slug: "beard-trim",
    name: "Beard Trim",
    description: "Shape, line-up, and beard oil.",
    priceCents: 2000,
    durationMin: 20,
  },
  {
    id: "e3333333-3333-4333-8333-333333333333",
    slug: "haircut-beard",
    name: "Haircut + Beard",
    description: "The full reset — cut and beard together.",
    priceCents: 4500,
    durationMin: 50,
  },
];

// Weekly recurring schedule: day-of-week → hourly start times. Tue–Sat,
// 09:00–16:00 (8 slots/day per RESEARCH Pattern 4 grid).
const WEEKLY_TEMPLATE: Record<number, string[]> = {
  2: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"],
  3: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"],
  4: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"],
  5: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"],
  6: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"],
};

// Date of the nth upcoming day that has WEEKLY_TEMPLATE times (Tue–Sat).
// Fixed day-of-week offsets drift onto Sunday/Monday — days the template does
// not schedule — on 5 of 7 weekdays, so sample bookings resolve their slot via
// the template itself instead of a raw +N days offset (keeps every booking
// inside the rolling window AND on an open day, every run).
function nthTemplateDay(n: number): Date {
  let found = 0;
  const d = new Date();
  while (found < n) {
    d.setDate(d.getDate() + 1);
    if (WEEKLY_TEMPLATE[d.getDay()]) found++;
  }
  return d;
}

// 4 sample bookings: 2 confirmed, 1 pending, 1 cancelled. slot_id is
// re-pointed into the current 14-day window on EVERY run via subselect
// (Pitfall 2 — fixed ids must never go stale). deposit_payment_id references
// BOOKING_PAYMENTS (e4 prefix); non-deposit bookings pass null.
// dayIndex 1..4 = 1st..4th upcoming Tue–Sat day (f3 nearest, f4 farthest).
const SAMPLE_BOOKINGS = [
  {
    id: "f1111111-1111-4111-8111-111111111111",
    serviceSlug: "haircut",
    dayIndex: 2,
    time: "10:00",
    status: "confirmed",
    priceCents: 3000,
    depositPaymentId: "e4111111-1111-4111-8111-111111111111",
  },
  {
    id: "f2222222-2222-4222-8222-222222222222",
    serviceSlug: "beard-trim",
    dayIndex: 3,
    time: "11:00",
    status: "confirmed",
    priceCents: 2000,
    depositPaymentId: null,
  },
  {
    id: "f3333333-3333-4333-8333-333333333333",
    serviceSlug: "haircut",
    dayIndex: 1,
    time: "14:00",
    status: "pending",
    priceCents: 3000,
    depositPaymentId: null,
  },
  {
    id: "f4444444-4444-4444-8444-444444444444",
    serviceSlug: "haircut-beard",
    dayIndex: 4,
    time: "15:00",
    status: "cancelled",
    priceCents: 4500,
    depositPaymentId: "e4222222-2222-4222-8222-222222222222",
  },
];

// Deposit payments for the deposit bookings: f1's deposit succeeded (25% of
// $30 = 750), f4's was refunded when the booking was cancelled (25% of $45 =
// 1125) — demoing the refund path in /admin/payments.
const BOOKING_PAYMENTS = [
  { id: "e4111111-1111-4111-8111-111111111111", amount: 750, status: "succeeded" },
  { id: "e4222222-2222-4222-8222-222222222222", amount: 1125, status: "refunded" },
];

// Booking-linked notices (a3/b3 prefix — distinct from the Phase 0 a/b rows).
const BOOKING_EMAILS = [
  {
    id: "a3111111-1111-4111-8111-111111111111",
    bookingId: "f1111111-1111-4111-8111-111111111111",
    recipient: "demo@example.com",
    subject: "Booking confirmation",
    body: "Hi Demo User — your Haircut is booked. We'll text you a reminder before your appointment. See you at the shop!",
  },
  {
    id: "a4111111-1111-4111-8111-111111111111",
    bookingId: "f4444444-4444-4444-8444-444444444444",
    recipient: "demo@example.com",
    subject: "Booking confirmation",
    body: "Hi Demo User — your Haircut + Beard booking was cancelled, so no appointment is scheduled. Your deposit of $11.25 has been refunded.",
  },
];

const BOOKING_SMS = [
  {
    id: "b3111111-1111-4111-8111-111111111111",
    bookingId: "f1111111-1111-4111-8111-111111111111",
    recipient: "+15551234567",
    message: "Reminder: your Haircut is booked at the barbershop. Reply STOP to opt out of booking texts.",
  },
  {
    id: "b4111111-1111-4111-8111-111111111111",
    bookingId: "f4444444-4444-4444-8444-444444444444",
    recipient: "+15551234567",
    message: "Your Haircut + Beard booking was cancelled. Any deposit has been refunded. Reply STOP to opt out.",
  },
];

// ─── Phase 3: Northstar Coffee ecommerce fixtures ────────────────────────────
// Fresh deterministic id families keep shop rows separate from foundation,
// CMS, and booking fixtures. Product ids/slugs are stable so cart/order
// upserts remain idempotent across seed runs.
const NORTHSTAR_CATEGORIES = [
  { id: "91111111-1111-4111-8111-111111111111", slug: "drinks", name: "Drinks" },
  { id: "92222222-2222-4222-8222-222222222222", slug: "beans", name: "Beans" },
  { id: "93333333-3333-4333-8333-333333333333", slug: "bakery", name: "Bakery" },
];

const NORTHSTAR_PRODUCTS = [
  {
    id: "81111111-1111-4111-8111-111111111111",
    categorySlug: "drinks",
    slug: "house-espresso",
    name: "House Espresso",
    description: "Dark chocolate, toasted almond, and a clean finish.",
    priceCents: 350,
    inventory: 28,
  },
  {
    id: "82222222-2222-4222-8222-222222222222",
    categorySlug: "drinks",
    slug: "oat-milk-latte",
    name: "Oat Milk Latte",
    description: "Silky oat milk over the house espresso blend.",
    priceCents: 550,
    inventory: 24,
  },
  {
    id: "83333333-3333-4333-8333-333333333333",
    categorySlug: "drinks",
    slug: "northstar-cold-brew",
    name: "Northstar Cold Brew",
    description: "Slow-steeped and bright, served over a full glass of ice.",
    priceCents: 600,
    inventory: 18,
  },
  {
    id: "84444444-4444-4444-8444-444444444444",
    categorySlug: "drinks",
    slug: "honey-cinnamon-cortado",
    name: "Honey Cinnamon Cortado",
    description: "Equal parts espresso and steamed milk with local honey.",
    priceCents: 650,
    inventory: 12,
  },
  {
    id: "85555555-5555-4555-8555-555555555555",
    categorySlug: "beans",
    slug: "house-roast",
    name: "House Roast",
    description: "A dependable medium roast for mornings that need a little lift.",
    priceCents: 1600,
    inventory: 16,
  },
  {
    id: "86666666-6666-4666-8666-666666666666",
    categorySlug: "beans",
    slug: "bright-morning",
    name: "Bright Morning",
    description: "Washed Colombia with citrus, caramel, and a soft body.",
    priceCents: 1800,
    inventory: 11,
  },
  {
    id: "87777777-7777-4777-8777-777777777777",
    categorySlug: "beans",
    slug: "decaf-afterglow",
    name: "Decaf Afterglow",
    description: "Swiss-water decaf with cocoa nib and brown sugar notes.",
    priceCents: 1700,
    inventory: 9,
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    categorySlug: "beans",
    slug: "kenya-single-origin",
    name: "Kenya Single Origin",
    description: "Blackcurrant, hibiscus, and a sparkling finish from Nyeri.",
    priceCents: 2200,
    inventory: 7,
  },
  {
    id: "89999999-9999-4999-8999-999999999999",
    categorySlug: "bakery",
    slug: "butter-croissant",
    name: "Butter Croissant",
    description: "Flaky layers, cultured butter, and a crisp golden edge.",
    priceCents: 425,
    inventory: 14,
  },
  {
    id: "8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    categorySlug: "bakery",
    slug: "cardamom-bun",
    name: "Cardamom Bun",
    description: "Twisted brioche with cardamom sugar and orange zest.",
    priceCents: 475,
    inventory: 10,
  },
  {
    id: "8bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
    categorySlug: "bakery",
    slug: "chocolate-rye-cookie",
    name: "Chocolate Rye Cookie",
    description: "Bittersweet chocolate, rye flour, and a pinch of sea salt.",
    priceCents: 325,
    inventory: 20,
  },
  {
    id: "8ccccccc-cccc-4ccc-8ccc-ccccccccccc1",
    categorySlug: "bakery",
    slug: "morning-scone",
    name: "Morning Scone",
    description: "Tender cream scone with seasonal fruit and lemon glaze.",
    priceCents: 400,
    inventory: 13,
  },
];

const NORTHSTAR_PAYMENTS = [
  { id: "54444444-4444-4444-8444-444444444444", amount: 1125, status: "succeeded" },
  { id: "55555555-5555-4555-8555-555555555555", amount: 2550, status: "succeeded" },
  { id: "56666666-6666-4666-8666-666666666666", amount: 600, status: "refunded" },
];

const NORTHSTAR_ORDERS = [
  {
    id: "71111111-1111-4111-8111-111111111111",
    paymentId: "54444444-4444-4444-8444-444444444444",
    status: "paid",
    totalCents: 1125,
    daysAgo: 1,
  },
  {
    id: "72222222-2222-4222-8222-222222222222",
    paymentId: "55555555-5555-4555-8555-555555555555",
    status: "preparing",
    totalCents: 2550,
    daysAgo: 2,
  },
  {
    id: "73333333-3333-4333-8333-333333333333",
    paymentId: "56666666-6666-4666-8666-666666666666",
    status: "cancelled",
    totalCents: 600,
    daysAgo: 3,
  },
];

const NORTHSTAR_ORDER_ITEMS = [
  {
    id: "61111111-1111-4111-8111-111111111111",
    orderId: "71111111-1111-4111-8111-111111111111",
    productSlug: "house-espresso",
    productName: "House Espresso",
    quantity: 2,
    unitPriceCents: 350,
    lineTotalCents: 700,
  },
  {
    id: "62222222-2222-4222-8222-222222222222",
    orderId: "71111111-1111-4111-8111-111111111111",
    productSlug: "butter-croissant",
    productName: "Butter Croissant",
    quantity: 1,
    unitPriceCents: 425,
    lineTotalCents: 425,
  },
  {
    id: "63333333-3333-4333-8333-333333333333",
    orderId: "72222222-2222-4222-8222-222222222222",
    productSlug: "house-roast",
    productName: "House Roast",
    quantity: 1,
    unitPriceCents: 1600,
    lineTotalCents: 1600,
  },
  {
    id: "64444444-4444-4444-8444-444444444444",
    orderId: "72222222-2222-4222-8222-222222222222",
    productSlug: "cardamom-bun",
    productName: "Cardamom Bun",
    quantity: 2,
    unitPriceCents: 475,
    lineTotalCents: 950,
  },
  {
    id: "65555555-5555-4555-8555-555555555555",
    orderId: "73333333-3333-4333-8333-333333333333",
    productSlug: "northstar-cold-brew",
    productName: "Northstar Cold Brew",
    quantity: 1,
    unitPriceCents: 600,
    lineTotalCents: 600,
  },
];

const NORTHSTAR_EMAILS = [
  {
    id: "a5111111-1111-4111-8111-111111111111",
    orderId: "71111111-1111-4111-8111-111111111111",
    subject: "Northstar Coffee receipt",
    body: "Your Northstar Coffee order is confirmed for counter pickup.",
  },
  {
    id: "a5222222-2222-4222-8222-222222222222",
    orderId: "72222222-2222-4222-8222-222222222222",
    subject: "Northstar Coffee receipt",
    body: "Your Northstar Coffee order is being prepared for counter pickup.",
  },
];

async function seedDemoData() {
  const passwordHash = await bcrypt.hash("demo1234", 10);
  await sqlDirect`
    INSERT INTO users (id, email, name, password_hash)
    VALUES (${DEMO_USER_ID}, 'demo@example.com', 'Demo User', ${passwordHash})
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`;

  for (const category of CATEGORIES) {
    await sqlDirect`
      INSERT INTO categories (id, slug, name)
      VALUES (${category.id}, ${category.slug}, ${category.name})
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`;
  }

  for (const tag of TAGS) {
    await sqlDirect`
      INSERT INTO tags (id, slug, name)
      VALUES (${tag.id}, ${tag.slug}, ${tag.name})
      ON CONFLICT (slug) DO NOTHING`;
  }

  for (const post of POSTS) {
    // Deterministic staggered publish dates, computed in JS (avoids
    // parameter-type inference issues with interval arithmetic).
    const publishedAt = new Date(Date.now() - post.daysAgo * 86_400_000);
    const coverImage = `https://picsum.photos/seed/${post.slug}/800/533`;
    await sqlDirect`
      INSERT INTO posts (id, title, content, status, slug, category_id,
        cover_image, author_id, published_at)
      VALUES (${post.id}, ${post.title}, ${post.content}, 'published', ${post.slug},
        (SELECT id FROM categories WHERE slug = ${post.categorySlug}),
        ${coverImage},
        (SELECT id FROM users WHERE email = 'demo@example.com'),
        ${publishedAt})
      ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title, content = EXCLUDED.content,
            status = EXCLUDED.status, slug = EXCLUDED.slug,
            category_id = EXCLUDED.category_id, cover_image = EXCLUDED.cover_image,
            published_at = EXCLUDED.published_at, updated_at = now()`;

    for (const tagSlug of post.tagSlugs) {
      await sqlDirect`
        INSERT INTO post_tags (post_id, tag_id)
        VALUES (${post.id}, (SELECT id FROM tags WHERE slug = ${tagSlug}))
        ON CONFLICT DO NOTHING`;
    }
  }

  for (const email of MOCK_EMAILS) {
    await sqlDirect`
      INSERT INTO mock_emails (id, recipient, subject, body, status, booking_id)
      VALUES (${email.id}, ${email.recipient}, ${email.subject}, ${email.body}, 'sent', null)
      ON CONFLICT (id) DO NOTHING`;
  }

  for (const sms of MOCK_SMS) {
    await sqlDirect`
      INSERT INTO mock_sms (id, recipient, message, status, booking_id)
      VALUES (${sms.id}, ${sms.recipient}, ${sms.message}, 'delivered', null)
      ON CONFLICT (id) DO NOTHING`;
  }

  for (const payment of MOCK_PAYMENTS) {
    await sqlDirect`
      INSERT INTO mock_payments (id, amount, currency, status)
      VALUES (${payment.id}, ${payment.amount}, ${payment.currency}, ${payment.status})
      ON CONFLICT (id) DO NOTHING`;
  }

  // ─── Phase 2: services → slots → bookings → booked_at marks → linked ───────
  for (const service of SERVICES) {
    await sqlDirect`
      INSERT INTO services (id, slug, name, description, price_cents, duration_min)
      VALUES (${service.id}, ${service.slug}, ${service.name}, ${service.description},
        ${service.priceCents}, ${service.durationMin})
      ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description,
            price_cents = EXCLUDED.price_cents,
            duration_min = EXCLUDED.duration_min`;
  }

  // Rolling 14-day slot generation from WEEKLY_TEMPLATE. Explicit ::date/::time
  // casts on the JS-computed string params (Pitfall 8 — never interpolate a
  // date literal into the SQL string). ON CONFLICT DO NOTHING: new days append,
  // old days linger harmlessly (queries filter slot_date >= CURRENT_DATE).
  for (let offset = 0; offset < 14; offset++) {
    const day = new Date();
    day.setDate(day.getDate() + offset);
    const times = WEEKLY_TEMPLATE[day.getDay()];
    if (!times) continue;
    const dateKey = toDateKey(day);
    for (const service of SERVICES) {
      for (const time of times) {
        await sqlDirect`
          INSERT INTO slots (service_id, slot_date, slot_time)
          VALUES (${service.id}, ${dateKey}::date, ${time}::time)
          ON CONFLICT (service_id, slot_date, slot_time) DO NOTHING`;
      }
    }
  }

  // Deposit payments FIRST — the bookings upsert below references them via
  // deposit_payment_id (FK ordering: the referenced row must exist first).
  for (const pay of BOOKING_PAYMENTS) {
    await sqlDirect`
      INSERT INTO mock_payments (id, amount, currency, status)
      VALUES (${pay.id}, ${pay.amount}, 'usd', ${pay.status})
      ON CONFLICT (id) DO UPDATE
        SET amount = EXCLUDED.amount, status = EXCLUDED.status`;
  }

  // Sample bookings re-point slot_id into the CURRENT window on every run via
  // subselect on (service slug, date, time) — fixed ids never go stale
  // (Pitfall 2). Then booked_at marks demo the claim state: active bookings
  // claim their slot, the cancelled one reopens it (UI-SPEC Visual Quality 7).
  // WR-04 guards: if a REAL booking now holds a sample slot, the active-slot
  // partial unique index rejects the sample upsert (23505) → skip that sample
  // with a log line instead of crashing; and booked_at is only ever stamped
  // (b.id = sample guard) / cleared (NOT EXISTS guard) when the slot's claim
  // genuinely belongs to the sample booking — never over a real customer's.
  for (const booking of SAMPLE_BOOKINGS) {
    const slotDate = toDateKey(nthTemplateDay(booking.dayIndex));
    try {
      const rows = await sqlDirect`
        INSERT INTO bookings (id, slot_id, user_id, status, price_cents, deposit_payment_id)
        VALUES (${booking.id},
          (SELECT id FROM slots
            WHERE service_id = (SELECT id FROM services WHERE slug = ${booking.serviceSlug})
              AND slot_date = ${slotDate}::date
              AND slot_time = ${booking.time}::time),
          (SELECT id FROM users WHERE email = 'demo@example.com'),
          ${booking.status}, ${booking.priceCents}, ${booking.depositPaymentId})
        ON CONFLICT (id) DO UPDATE
          SET slot_id = EXCLUDED.slot_id, status = EXCLUDED.status,
              price_cents = EXCLUDED.price_cents,
              deposit_payment_id = EXCLUDED.deposit_payment_id,
              updated_at = now()
        RETURNING slot_id`;
      const slotId = rows[0].slot_id as string;
      if (booking.status === "cancelled") {
        // Reopen only when the slot is genuinely free — a real booking that
        // landed on this sample slot keeps its claim (cancel-path discipline).
        await sqlDirect`
          UPDATE slots SET booked_at = NULL
           WHERE id = ${slotId}
             AND NOT EXISTS (
               SELECT 1 FROM bookings
                WHERE slot_id = ${slotId} AND status <> 'cancelled'
                  AND id <> ${booking.id}
             )`;
      } else {
        // Claim only when THIS sample booking is the slot's active booking
        // (id guard) — never stamp booked_at over a real booking's claim.
        await sqlDirect`
          UPDATE slots SET booked_at = now()
           WHERE id = ${slotId}
             AND EXISTS (
               SELECT 1 FROM bookings
                WHERE slot_id = ${slotId} AND status <> 'cancelled'
                  AND id = ${booking.id}
             )`;
      }
    } catch (error) {
      // A real booking holds this sample's slot — the partial unique index
      // rejects the active sample upsert. Skip the sample this run (the demo
      // keeps its real customer's claim) instead of aborting the whole seed.
      if ((error as { code?: string }).code === "23505") {
        console.log(
          `  · sample booking ${booking.id} skipped — slot now held by a real booking`,
        );
        continue;
      }
      throw error;
    }
  }

  for (const notice of BOOKING_EMAILS) {
    await sqlDirect`
      INSERT INTO mock_emails (id, recipient, subject, body, status, booking_id)
      VALUES (${notice.id}, ${notice.recipient}, ${notice.subject}, ${notice.body}, 'sent', ${notice.bookingId})
      ON CONFLICT (id) DO NOTHING`;
  }

  for (const notice of BOOKING_SMS) {
    await sqlDirect`
      INSERT INTO mock_sms (id, recipient, message, status, booking_id)
      VALUES (${notice.id}, ${notice.recipient}, ${notice.message}, 'delivered', ${notice.bookingId})
      ON CONFLICT (id) DO NOTHING`;
  }

  // ─── Phase 3: shop categories → products → payments → cart → orders → receipts ────
  for (const category of NORTHSTAR_CATEGORIES) {
    await sqlDirect`
      INSERT INTO shop_categories (id, slug, name)
      VALUES (${category.id}, ${category.slug}, ${category.name})
      ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name, updated_at = now()`;
  }

  for (const product of NORTHSTAR_PRODUCTS) {
    const imageUrl = `https://picsum.photos/seed/${product.slug}/800/800`;
    await sqlDirect`
      INSERT INTO products
        (id, category_id, slug, name, description, image_url, price_cents, inventory)
      VALUES (
        ${product.id},
        (SELECT id FROM shop_categories WHERE slug = ${product.categorySlug}),
        ${product.slug}, ${product.name}, ${product.description}, ${imageUrl},
        ${product.priceCents}, ${product.inventory}
      )
      ON CONFLICT (slug) DO UPDATE
        SET category_id = EXCLUDED.category_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            image_url = EXCLUDED.image_url,
            price_cents = EXCLUDED.price_cents,
            updated_at = now()`;
  }

  // Payment rows must exist before orders because orders.payment_id is a FK.
  for (const pay of NORTHSTAR_PAYMENTS) {
    await sqlDirect`
      INSERT INTO mock_payments (id, amount, currency, status)
      VALUES (${pay.id}, ${pay.amount}, 'usd', ${pay.status})
      ON CONFLICT (id) DO NOTHING`;
  }

  // Seed the walkthrough cart only before the demo order fixtures exist. The
  // first seed's order rows act as a durable marker, so a later seed never
  // repopulates a cart that a user checked out, cleared, or edited.
  await sqlDirect`
    INSERT INTO cart_items (user_id, product_id, quantity)
    SELECT demo.id, product.id, 1
      FROM (SELECT id FROM users WHERE email = 'demo@example.com') AS demo
      CROSS JOIN (SELECT id FROM products WHERE slug = 'morning-scone') AS product
     WHERE NOT EXISTS (
       SELECT 1 FROM orders WHERE user_id = demo.id
     )
    ON CONFLICT (user_id, product_id) DO NOTHING`;

  for (const order of NORTHSTAR_ORDERS) {
    const createdAt = new Date(Date.now() - order.daysAgo * 86_400_000);
    await sqlDirect`
      INSERT INTO orders (id, user_id, payment_id, total_cents, status, created_at, updated_at)
      VALUES (
        ${order.id},
        (SELECT id FROM users WHERE email = 'demo@example.com'),
        ${order.paymentId}, ${order.totalCents}, ${order.status}, ${createdAt}, ${createdAt}
      )
      ON CONFLICT (id) DO NOTHING`;
  }

  for (const item of NORTHSTAR_ORDER_ITEMS) {
    await sqlDirect`
      INSERT INTO order_items
        (id, order_id, product_id, product_name, quantity,
         unit_price_cents, line_total_cents)
      VALUES (
        ${item.id}, ${item.orderId},
        (SELECT id FROM products WHERE slug = ${item.productSlug}),
        ${item.productName}, ${item.quantity},
        ${item.unitPriceCents}, ${item.lineTotalCents}
      )
      ON CONFLICT (id) DO NOTHING`;
  }

  for (const notice of NORTHSTAR_EMAILS) {
    await sqlDirect`
      INSERT INTO mock_emails
        (id, recipient, subject, body, status, booking_id, order_id)
      VALUES (
        ${notice.id}, 'demo@example.com', ${notice.subject}, ${notice.body},
        'sent', null, ${notice.orderId}
      )
      ON CONFLICT (id) DO NOTHING`;
  }
}

// ─── 4. Report (exact counts — RESEARCH A7) + size gate ─────────────────────
const TABLES = [
  "schema_migrations",
  "users",
  "posts",
  "categories",
  "tags",
  "post_tags",
  "services",
  "slots",
  "bookings",
  "shop_categories",
  "products",
  "cart_items",
  "orders",
  "order_items",
  "mock_payments",
  "mock_emails",
  "mock_sms",
  "mock_uploads",
];

async function report() {
  console.log("\nTable                 Rows");
  console.log("──────────────────────────────");
  let totalRows = 0;
  for (const table of TABLES) {
    // Table names come from the hardcoded array above — unsafe() interpolation
    // is safe here (never user input).
    const rows =
      await sqlDirect`SELECT count(*)::int AS count FROM ${sqlDirect.unsafe(table)}`;
    const count = rows[0].count as number;
    totalRows += count;
    console.log(`${table.padEnd(21)} ${count}`);
  }

  const sizeRows = await sqlDirect`SELECT pg_database_size(current_database()) AS bytes`;
  const bytes = sizeRows[0].bytes as number;
  const mb = bytes / (1024 * 1024);

  console.log(`\nTotal rows: ${totalRows}`);
  console.log(`Database size: ${mb.toFixed(2)} MB`);

  if (mb >= 200) {
    console.error(`FATAL: database is ${mb.toFixed(2)} MB — over the 200 MB hard gate. Clean up demo data.`);
    process.exit(1);
  }
  console.log(`Seed complete: ${TABLES.length} tables, TOTAL ${mb.toFixed(2)} MB (< 200 MB ✓)`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Running migrations…");
  await runMigrations();

  console.log("Upserting demo data…");
  await seedDemoData();

  await report();
}

main().catch((error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
