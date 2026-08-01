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
const POSTS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Template Guide — build your next app in minutes",
    content:
      "This template ships the fullstack essentials: email/password auth with a signed JWT in an httpOnly cookie, raw-SQL data access against Neon, six pluggable mock services, and a reference Posts CRUD.\n\nTo fork it for your own demo: copy the repo, bump TEMPLATE_VERSION in lib/site.ts, then run npm run seed and npm run dev. Everything — auth, mocks, admin views — works against the seeded demo account.\n\nStick to the conventions in AGENTS.md: proxy.ts (not middleware.ts), force-dynamic on every DB-reading page, and bcrypt only inside route handlers.",
    status: "published",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Mock Services — how the demo layer works",
    content:
      "Every demo needs third-party services (payments, email, SMS, OAuth, maps, storage) — none of which should be called for real in a template. Each mock mirrors the real provider's interface and persists its events to a mock_* table you can inspect under /admin.\n\nSet MOCK_PAYMENT=mock (default) to use the in-process simulation. createPayment supports a fail:true option so you can demo failure paths on demand. The \"real\" value is reserved for future apps that wire actual providers — the import surface (@/lib/mock) never changes.",
    status: "published",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Deploy Walkthrough — Vercel + Neon at $0",
    content:
      "The template is built to stay on free tiers: Vercel Hobby (1M function invocations/month, account-wide) and Neon (0.5 GB per project). The seed enforces a hard size gate at 200 MB so demo data can never eat the budget.\n\nDeploy: push to GitHub, import the repo in Vercel, paste the 9 env vars from .env.example (both Neon URLs from the Connect modal — pooled for the app, direct for migrations), and push to main. The first visit may take a few seconds while Neon wakes from cold storage.",
    status: "published",
  },
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

  for (const post of POSTS) {
    await sqlDirect`
      INSERT INTO posts (id, title, content, status, author_id)
      VALUES (${post.id}, ${post.title}, ${post.content}, ${post.status},
        (SELECT id FROM users WHERE email = 'demo@example.com'))
      ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title, content = EXCLUDED.content,
            status = EXCLUDED.status, updated_at = now()`;
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
