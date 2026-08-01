// npm run seed — migrations + idempotent demo data + size report.
// Self-contained on purpose: does NOT import lib/* modules (they carry
// "server-only", which throws outside Next). Uses sqlDirect (direct URL) for
// migrations per Neon docs; pooler URL is for the app only.
//
// Order: (1) load env → (2) run pending migrations → (3) upsert demo data →
// (4) report per-table counts + total size; exit(1) at >= 200 MB (hard gate).

import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

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
      ON CONFLICT (id) DO NOTHING`;
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
      INSERT INTO mock_emails (id, recipient, subject, body, status)
      VALUES (${email.id}, ${email.recipient}, ${email.subject}, ${email.body}, 'sent')
      ON CONFLICT (id) DO NOTHING`;
  }

  for (const sms of MOCK_SMS) {
    await sqlDirect`
      INSERT INTO mock_sms (id, recipient, message, status)
      VALUES (${sms.id}, ${sms.recipient}, ${sms.message}, 'delivered')
      ON CONFLICT (id) DO NOTHING`;
  }

  for (const payment of MOCK_PAYMENTS) {
    await sqlDirect`
      INSERT INTO mock_payments (id, amount, currency, status)
      VALUES (${payment.id}, ${payment.amount}, ${payment.currency}, ${payment.status})
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
