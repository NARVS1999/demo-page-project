# Pitfalls Research

**Domain:** Free fullstack portfolio showcase (10-30 demo apps)
**Researched:** Aug 2026
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Vercel Hobby Tier Silent Kill — Account-Wide Limits

**What goes wrong:**
You deploy 20 projects, each "only" getting ~50k invocations/month. Sounds fine. But the 1M invocations limit is *per-account*, not per-project. 20 projects × 50k = 1M. You hit the wall and ALL projects return 503s simultaneously. The 4-hour active CPU limit compounds this: if one project has a heavy seed script or cron, it steals CPU budget from every other project.

**Why it happens:**
Vercel's dashboard shows per-project metrics, creating the illusion of per-project limits. Developers monitor individual project dashboards and don't realize they're draining a shared account-level bucket. The Hobby tier documentation doesn't prominently warn about this.

**How to avoid:**
- Budget explicitly: reserve 10% of 1M invocations for the portfolio shell itself. That leaves ~900k for 20-30 projects. At 30 projects = 30k invocations each/month. Write this budget in the README for every project.
- Add a shared spreadsheet tracking estimated monthly invocations per project.
- Never put heavy cron jobs on Hobby tier — use GitHub Actions (free 2,000 min/mo) for anything repetitive.
- Set Vercel deployment protection / rate limits on individual projects to prevent abuse (one bad bot can drain your quota).

**Warning signs:**
- Projects start returning 503 or 429 errors after being live for weeks
- Vercel dashboard shows "Function Duration" spiking across unrelated projects
- CPU time exhaustion alerts on the account level

**Phase to address:** Phase 0 (Template) — build the budget tracker into the template README; Phase 4 (Portfolio) — add a health dashboard that monitors invocation counts

---

### Pitfall 2: Neon Scale-to-Zero Cold Start — Users See Blanks

**What goes wrong:**
Neon's free tier scales compute to zero after ~5 minutes of inactivity. First request after idle takes 500ms-2s to wake the database. Worse: Next.js serverless functions on Vercel also cold-start. Combined cold start = user sees blank page or spinner for 3-5 seconds on first visit. In a portfolio context, a reviewer clicks your link and sees a broken page.

**Why it happens:**
Both Vercel functions and Neon compute scale to zero independently. You're optimizing one layer while the other is frozen. Developers test locally (where Neon is always warm) and never experience the double cold-start.

**How to avoid:**
- Add a `README` note on every project: "First visit may take a few seconds — the database wakes from sleep."
- Consider a free cron ping (GitHub Actions hitting each project's health endpoint every 5 minutes) — but be mindful this burns Vercel invocations.
- Better: accept the cold start. It's a portfolio, not production. Document it, don't fight it.
- For the portfolio shell itself, use `export const dynamic = 'force-static'` on pages that don't need DB — static pages have zero cold start.

**Warning signs:**
- Testing shows fast responses, but a friend visiting the link reports "it was blank"
- First Lighthouse performance score is abysmal (FCP > 3s)
- Database connection errors in Vercel logs during low-traffic hours

**Phase to address:** Phase 0 (Template) — document cold start behavior; Phase 1 (CMS) — validate cold start is acceptable before building 28 more apps

---

### Pitfall 3: Neon 0.5 GB Limit — Seed Data Bloat

**What goes wrong:**
You create a cool ecommerce demo with 500 products, each with a base64-encoded image blob. Seed script runs, fills 0.4 GB. Now every new record risks hitting the limit. Neon starts refusing writes. The "simple" seed data consumed your entire free tier budget.

**Why it happens:**
0.5 GB sounds like plenty until you remember: Postgres stores images as BYTEA (base64 = 33% overhead), indexes duplicate data, and WAL logs count against storage. Developers optimize for features, not storage budgets.

**How to avoid:**
- Hard rule: seed data must stay under 200 MB (40% of limit) to leave room for actual demo usage.
- Store images in Vercel Blob (1 GB free) or use placeholder URLs (https://picsum.photos/), never in Postgres.
- Every project's seed script must output `SELECT pg_size_pretty(pg_database_size(current_database()))` after seeding.
- Create a `scripts/check-storage.sh` that fails CI if DB exceeds 200 MB.
- Use text fields with short slugs, not UUIDs, to save a few bytes per row (adds up at scale).

**Warning signs:**
- `pg_database_size()` creeping above 300 MB during development
- Seed scripts that INSERT thousands of rows with TEXT/BYTEA columns
- "It works fine locally" but Neon dashboard shows storage near limit

**Phase to address:** Phase 0 (Template) — build storage check into seed script; Phase 1 (CMS) — validate with first real schema

---

### Pitfall 4: Template Divergence — Copy-Paste Drift

**What goes wrong:**
You build the template with auth, session, db.ts, mock services. Then for the booking app, you "just tweak" the auth to add role-based access. For ecommerce, you "just add" inventory checks to the session. After 10 projects, there are 10 different versions of `auth.ts`, `session.ts`, and `db.ts`. No two projects are alike. The "30 min per project" promise becomes 3 hours because you're debugging unique variations.

**Why it happens:**
Each project has slightly different requirements. The template is "just a starting point" so developers feel justified modifying it. Without discipline, every fork drifts. The original template stops being the source of truth.

**How to avoid:**
- Treat `ads-mediatech` as a **package**, not a starting point. Changes go back to the template first, then propagate.
- Use a `TEMPLATE_VERSION` constant in every project. When it drifts, you know.
- Rule: if you modify `lib/auth.ts` for project X, that change goes into the template. Project X then re-copies the template and applies only project-specific code on top.
- Keep the template generic: role-based auth should be a config flag (`ROLES=admin,user`), not a code fork.
- Use `.template-overrides/` directory for per-project customizations that don't belong in the template.

**Warning signs:**
- Two projects have different `session.ts` implementations
- Bug fixes in one project don't exist in others
- You can't remember which project has which auth variant
- Template README says "Step 3: modify auth.ts" — that's a red flag

**Phase to address:** Phase 0 (Template) — design the template with configuration over forking; Phase 1-3 (Flagships) — enforce "changes go back to template" discipline

---

### Pitfall 5: Mock Service Over-Engineering

**What goes wrong:**
You build a mock payment service that's 400 lines of code, with success/fail toggles, webhook simulation, refund endpoints, and a full admin UI. It works great. Then when you want to "swap to real Stripe later," you realize the mock's API surface doesn't match Stripe's at all. The mock was designed for convenience, not compatibility.

**Why it happens:**
Mock services are fun to build. They feel productive. But without a clear contract (what the real service's API looks like), the mock diverges. The "swappable later" promise breaks.

**How to avoid:**
- Design mock interfaces to **match the real service's API shape**, not the other way around.
- Example: `payment.ts` should export `createCheckoutSession()`, `confirmPayment()`, `refund()` — same method names as Stripe SDK.
- Keep mocks under 50 lines. If it's longer, you're building a product, not a mock.
- Add a comment at the top of every mock: `// MOCK: Replace with real [ServiceName] — interface must match [RealService].createX() signature.`
- The mock's job is to return realistic-shaped data, not to simulate every edge case.

**Warning signs:**
- Mock file is longer than 100 lines
- Mock has its own database tables or complex state management
- Mock requires its own test suite
- You're adding features to the mock that the real service doesn't have

**Phase to address:** Phase 0 (Template) — establish mock interface contracts; all project phases — enforce mock simplicity

---

### Pitfall 6: Demo Data That Breaks the Demo

**What goes wrong:**
You seed a blog CMS with Lorem ipsum posts. Every post has the same title "Lorem Ipsum Dolor Sit amet". The demo looks broken — is this a real app or a placeholder? Or worse: you seed with real-looking data but hardcode credentials like `admin/admin123` that look unprofessional in a portfolio review.

**Why it happens:**
Seed data is an afterthought. Developers focus on features and throw in random placeholder text. Or they copy-paste the same seed script across projects without customizing.

**How to avoid:**
- Every project needs **3-5 realistic, unique demo entries** that tell a story. CMS: blog posts about actual topics. Booking: a yoga studio with real class names. Ecommerce: a coffee shop with actual products.
- Use consistent demo credentials across projects: `demo@portfolio.dev` / `password123`. One login, all projects.
- Include a "Demo Guide" section in each README explaining what to try.
- Add a `scripts/seed-demo.ts` that creates the curated demo data (separate from bulk test data).

**Warning signs:**
- All entries in a list look identical
- Demo requires explanation ("click the third button, then...") — it should be self-explanatory
- Reviewer has to read the README to figure out what the app does

**Phase to address:** Phase 0 (Template) — create seed data template; Phase 1-3 (Flagships) — invest in quality demo data; Phase 5+ (Batch) — use the template seed with minor customization

---

### Pitfall 7: Next.js App Router — Server/Client Component Confusion

**What goes wrong:**
You build a page with `useState`, `onClick`, and `fetch('/api/...')` — all client-side. It works locally. Deploy to Vercel, and the page is slow, the API calls are waterfalled, and SEO is terrible because everything renders client-side. You used App Router but built a SPA.

**Why it happens:**
Developers coming from Pages Router or React SPAs instinctively add `'use client'` to everything. App Router defaults to server components, but the moment you need interactivity, the instinct is to make it a client component and fetch data there.

**How to avoid:**
- Default rule: **no `'use client'` unless the component needs `useState`, `useReducer`, `useEffect`, or browser APIs.**
- Data fetching goes in server components or Route Handlers, never in `useEffect` with `fetch`.
- Use `server-only` package to enforce the boundary: if a client component imports from `lib/db.ts`, it fails at build time.
- Pattern: page (server) → fetches data → passes to child (client for interactivity only).
- The portfolio reviewer will notice: client-fetched pages flash content, server-rendered pages are instant.

**Warning signs:**
- `'use client'` at the top of page components
- `useEffect` with `fetch` inside page components
- Lighthouse shows high TTI (Time to Interactive) but fast FCP
- Content is invisible to crawlers (view-source shows empty div)

**Phase to address:** Phase 0 (Template) — enforce server-first patterns in template pages; every project phase — code review for `'use client'` abuse

---

### Pitfall 8: Missing `.env.example` — Deploy Hell

**What goes wrong:**
Template has 8 environment variables (`DATABASE_URL`, `SESSION_SECRET`, `NEXTAUTH_SECRET`, etc.). New developer clones the repo, runs `npm run dev`, gets cryptic errors. Or: you deploy to Vercel, forget one env var, and the app crashes at runtime (not build time). With 20-30 projects, tracking which env vars each needs becomes a nightmare.

**Why it happens:**
Environment variables are invisible until they're missing. There's no compile-time check. Each project adds its own env vars (mock config flags, feature toggles) and nobody documents them.

**How to avoid:**
- Every project MUST have a `.env.example` that lists all required variables with placeholder values.
- Add a startup check in `lib/db.ts`: if `DATABASE_URL` is missing, throw a clear error immediately, not a cryptic PG connection error.
- Use a shared env schema file (`lib/env.ts`) with Zod validation: `const env = envSchema.parse(process.env)`. Fails fast with a readable message.
- Maintain a spreadsheet or markdown table mapping projects → required env vars.

**Warning signs:**
- "It works locally but not on Vercel" — classic missing env var
- Error messages mention `undefined` in database queries
- New clone of repo takes > 30 minutes to get running

**Phase to address:** Phase 0 (Template) — build env validation into template; Phase 4 (Portfolio) — document all env vars per project

---

### Pitfall 9: Vercel Blob Storage Gotcha — 1 GB Isn't 1 GB

**What goes wrong:**
Vercel Blob free tier is 1 GB. Sounds like plenty for demo images. But: every upload version counts (no automatic garbage collection), file metadata counts, and if you store base64 in Postgres as a fallback, you're double-counting. You hit 1 GB fast and uploads start failing silently.

**Why it happens:**
Blob storage limits aren't well-documented in terms of what counts. Developers assume "1 GB of files" but it's actually "1 GB of stored objects including versions and metadata."

**How to avoid:**
- Use external placeholder images (picsum.photos, unsplash source) for demo content. Never upload real images.
- If uploads are a feature demo, use small (< 100 KB) test images only.
- Set a hard cap: max 10 uploads per project, max 100 KB each = 1 MB total. Leave 999 MB as buffer.
- Don't use Blob as a Postgres image backup. Pick one, not both.

**Warning signs:**
- Upload failures after a few demo sessions
- Vercel dashboard shows Blob usage creeping unexpectedly
- Base64 data in Postgres alongside Blob references

**Phase to address:** Phase 0 (Template) — configure mock storage with size limits; Phase 3 (Ecommerce) — validate with image-heavy demo

---

### Pitfall 10: 30 Repos = 30x Maintenance Burden

**What goes wrong:**
You deploy 30 projects. Each has its own repo, its own Vercel project, its own env vars. A critical dependency (e.g., a Next.js security patch) drops. You need to update 30 repos. Or: the template's `session.ts` has a bug, and you need to fix it in 30 places. Maintenance becomes a full-time job.

**Why it happens:**
Separate repos = separate everything. No monorepo tooling, no shared dependency management. Each project is an island.

**How to avoid:**
- Accept this upfront: **maintenance is part of the portfolio.** Budget 1 hour/month for updates.
- Create a `scripts/update-all.sh` that clones all repos, runs `npm update`, and pushes.
- Use a shared `package.json` config in the template — when you add a dependency to the template, document which projects need it.
- Consider GitHub Actions to auto-update dependencies across repos on a schedule.
- Keep projects simple enough that updates are trivial (no complex dependency trees).
- Truth: at portfolio scale, you won't maintain all 30. Prioritize the top 5 flagship projects and let the rest be snapshots in time.

**Warning signs:**
- Security audit shows vulnerabilities in 20+ repos
- "I haven't updated this project in 6 months"
- Template has features that only half the projects use

**Phase to address:** Phase 0 (Template) — build update automation; Phase 4 (Portfolio) — create maintenance checklist; Ongoing — monthly review

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `'use client'` on everything | Faster to build, less thinking | Slow pages, poor SEO, waterfalled data fetching | Never in App Router — use server components by default |
| Hardcoded demo data in components | Quick visual result | Can't customize per-deploy, seed scripts break | Only during initial prototype, must move to seed script before deploy |
| Skipping `lib/env.ts` validation | Faster setup | Cryptic runtime errors, "works locally" syndrome | Never — 30 minutes of setup saves hours of debugging |
| Copying project instead of using template | Immediate independence | 30 divergent codebases, no shared fixes | Never — always copy from template |
| Storing images in Postgres as base64 | No external dependencies | 33% storage overhead, 0.5 GB limit hit fast | Only for tiny icons (< 5 KB), use Blob or external URLs for everything else |
| Skipping `.env.example` | "I'll document it later" | Nobody knows what vars are needed, new clones fail | Never — 2 minutes per project |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Neon Postgres | Using connection pooling wrong (`pg` pool with high `max`) | Use `@neondatabase/serverless` with WebSocket pool; set `max: 1` for serverless functions |
| Neon Postgres | Not handling scale-to-zero | Accept it; add a startup check that retries connection 3x with backoff |
| Vercel Functions | Assuming persistent connections | Every request = new function instance; DB connections must be created per-request or use pooling |
| Vercel Blob | Storing images for display in Blob + base64 in DB | Pick one: Blob for uploads, external URLs for demo images |
| Vercel Cron | Heavy cron jobs eating CPU budget | Use GitHub Actions for anything > 1 second; Vercel cron is for lightweight pings |
| Session cookies | Using `localStorage` for sessions | Use `httpOnly` cookies with `secure: true` — sessions are server-side in Postgres |
| Mock services | Building mocks that don't match real API shape | Design mock interfaces to mirror the real service (Stripe, SendGrid, etc.) |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 queries in Route Handlers | API response > 500ms, DB connection count spikes | Use JOINs or `Promise.all` for parallel queries | At ~50 concurrent users (portfolio rarely hits this, but reviewers may stress-test) |
| Client-side data fetching in pages | Flash of empty content, poor Lighthouse score | Fetch in server components, pass as props | Always — client fetching is always slower in App Router |
| Large seed scripts | Deploy fails, seed takes > 30 seconds | Keep seed scripts under 1000 INSERTs; use COPY for bulk | At ~5000 rows |
| Missing database indexes | Slow queries as data grows | Index every foreign key and frequently-filtered column | At ~10k rows (unlikely in demo, but easy to prevent) |
| No loading.tsx or error.tsx | Users see blank page during slow loads | Add `loading.tsx` and `error.tsx` to every route group | Always — perceived performance matters for portfolio |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Hardcoded `SESSION_SECRET` in repo | Session hijacking if repo is public | Generate unique secret per project, store in Vercel env only |
| Demo credentials in README + production | Anyone can log in as admin | Acceptable for portfolio demos — but add a note: "Demo account, no real data" |
| No rate limiting on API routes | Bot can drain your Vercel invocation quota | Add simple in-memory rate limiting (100 req/min per IP) in middleware |
| Exposing `DATABASE_URL` in client bundles | Full database access to anyone | Verify `DATABASE_URL` is never imported in client components; use `server-only` |
| Mock services that log PII | Even mock data in logs can be a liability | Mock logs should use fake data, not real email/phone patterns |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading states | Page appears broken during DB cold start | Add skeleton screens or `loading.tsx` for every route |
| Inconsistent demo credentials | Reviewer tries different passwords per project | One credential set: `demo@portfolio.dev` / `password123` |
| No "what to try" guidance | Reviewer doesn't know what features to test | Add a "Demo Guide" card on the dashboard of each project |
| Broken links in portfolio shell | Reviewer clicks link, gets 404 | Health-check script that verifies all project URLs monthly |
| Dark mode broken or missing | Inconsistent experience | Theme must be built into the template, tested in both modes |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Auth system:** Works locally but session cookie not set with `secure: true` — test in incognito over HTTPS
- [ ] **Seed data:** Tables are populated but all entries look identical — verify unique, realistic demo content
- [ ] **Mock services:** Mock returns success but doesn't match real API shape — verify interface matches [Stripe/SendGrid/etc.]
- [ ] **Deploy:** App loads on Vercel but env vars missing — verify all `.env.example` vars are in Vercel dashboard
- [ ] **Database:** Schema works locally but Neon's 0.5 GB limit is near — run `pg_database_size()` check
- [ ] **Portfolio shell:** Links work today but projects may go down — add health monitoring
- [ ] **README:** Says "demo credentials: admin/admin123" but actual credentials are different — verify per project
- [ ] **Error handling:** API errors return 200 with error in body — verify proper HTTP status codes

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Vercel invocation limit hit | LOW | Identify heaviest project, add rate limiting, optimize or remove cron jobs |
| Neon storage full | LOW | Delete old seed data, remove base64 blobs, re-seed with lighter data |
| Template divergence discovered | MEDIUM | Pick best version, re-copy template to all projects, manually merge project-specific code |
| Mock service doesn't match real API | HIGH | Rewrite mock to match real service interface; may require updating all call sites |
| Env var missing in production | LOW | Add to Vercel dashboard, redeploy (automatic on next push) |
| Security secret leaked | MEDIUM | Rotate secret, invalidate all sessions, update env vars |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Vercel invocation limits | Phase 0 | Budget spreadsheet created; each project's README states expected usage |
| Neon cold start | Phase 0 | Documented in every README; first flagship validates acceptability |
| Seed data bloat | Phase 0 | `check-storage.sh` script in template; seed outputs DB size |
| Template divergence | Phase 0 | Template designed with config flags, not forks; `TEMPLATE_VERSION` constant |
| Mock over-engineering | Phase 0 | Mock interface contracts defined; all mocks < 50 lines |
| Demo data quality | Phase 1-3 | Each flagship has unique, realistic demo entries; Demo Guide in README |
| App Router misuse | Phase 0 | Template uses server components by default; `server-only` package enforced |
| Missing env validation | Phase 0 | `lib/env.ts` with Zod validation in template |
| Blob storage overflow | Phase 0 | Mock storage configured with size limits; external URLs for images |
| 30-repo maintenance | Phase 4 | `update-all.sh` script; maintenance checklist in portfolio shell |

## Sources

- Vercel Hobby tier documentation (https://vercel.com/docs/limits)
- Neon free tier documentation (https://neon.tech/docs/introduction/plans)
- Next.js App Router documentation (https://nextjs.org/docs/app)
- Common patterns from portfolio/showcase projects on GitHub
- Known issues with `@neondatabase/serverless` in serverless environments
- Vercel Blob storage limits (https://vercel.com/docs/storage/vercel-blob)

---
*Pitfalls research for: Free fullstack portfolio showcase (10-30 demo apps)*
*Researched: Aug 2026*
