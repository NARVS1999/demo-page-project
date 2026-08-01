# PRD: Free Fullstack Showcase — 30 Portfolio Projects

**Version:** 1.1 | **Date:** Aug 2026 | **Status:** Approved (draft)

## 1. Objective

Build 10–30 simple, fully functional fullstack demo projects, all deployed at **$0/month**, for portfolio/showcase purposes. Stack: **Next.js + Postgres** only (Laravel/MySQL retired from the plan for zero-cost hosting reasons).

## 2. Goals / Non-Goals

**Goals**
- 100% free hosting, no credit card, no billing info
- 4 deliverable apps: CMS, Booking, Ecommerce, Portfolio shell
- One reusable template (`nextjs-starter`) so every additional project takes ~30 min
- Every external service replaced with a simulated (mock) implementation first
- Testable locally (`npm run dev`) with the same remote DB used in production

**Non-Goals**
- No real payments, real emails, real SMS, real third-party OAuth
- No production traffic (portfolio/demo scale only)
- No MySQL — Postgres only (Neon free tier)
- No Laravel in new projects (requires credits/card to deploy free; skipped by decision)

## 3. Stack & Infrastructure (all $0)

| Layer | Choice | Free tier |
|---|---|---|
| Frontend + Backend | Next.js (App Router, TypeScript, Tailwind) — API via Route Handlers | Vercel Hobby — unlimited projects, 1M invocations/mo, 4h active CPU, 100 GB transfer |
| Database | Postgres via Neon | 100 projects, 0.5 GB each, 100 CU-hrs/project/mo, scale-to-zero |
| Auth | Credentials login, session in Postgres (no NextAuth) | built-in |
| File storage | Vercel Blob (1 GB) or DB/base64 for demo | included |
| Cron | Vercel Cron / GitHub Actions | included |
| Git | GitHub (free account: NARVS1999) | free |

### 3.1 Backend structure (all projects follow this)

```
nextjs-starter/                    # bawat project sumusunod dito
├── app/
│   ├── api/                       # ← BACKEND (server-side, Vercel Functions)
│   │   ├── auth/
│   │   │   ├── login/route.ts     #   POST: verify credentials, create session
│   │   │   ├── register/route.ts
│   │   │   └── logout/route.ts
│   │   ├── posts/route.ts         #   GET list, POST create
│   │   ├── posts/[id]/route.ts    #   GET one, PUT update, DELETE
│   │   └── ... (per-project: bookings/, orders/, products/, etc.)
│   ├── (auth)/login/page.tsx      # ← FRONTEND (React components)
│   ├── (auth)/register/page.tsx
│   ├── dashboard/page.tsx
│   └── page.tsx
├── lib/
│   ├── db.ts                      # pg serverless pool + queries
│   ├── session.ts                 # session cookie creation/verification
│   ├── validate.ts                # input validation (server-side)
│   ├── auth.ts                    # route protection helper (middleware)
│   └── mock/                      # simulated external services
│       ├── payment.ts  email.ts  sms.ts
│       ├── oauth.ts  maps.ts  storage.ts
├── scripts/seed.ts                # demo data
└── README.md
```

**How it works:** browser calls `app/api/*` (like Laravel routes) → server code on Vercel queries Neon Postgres → returns JSON → React renders. Same client-server-DB pattern as Laravel, different runtime.

## 4. Mock Services Layer (the core rule)

**Rule:** Any feature requiring an external service calls `lib/mock/*` — swappable later without touching business logic.

| Service | Mock implementation |
|---|---|
| `payment.ts` | "Test Payment" screen, 3s delay, success/fail toggle |
| `email.ts` | Saves to `emails` table; "Email Outbox" view in admin |
| `sms.ts` | Log to table, viewable in admin |
| `oauth.ts` | Fake Google login → auto-login demo user |
| `maps.ts` | Static mock coordinates/data |
| `storage.ts` | Upload → Vercel Blob or base64 |

## 5. Template (`nextjs-starter`) — built once

- Auth (login/register/logout, sessions)
- `lib/db.ts` (pg serverless pool), schema helpers
- Seed script (`npm run seed`) — demo data
- Mock services (section 4)
- Layout, loading/error states, dark/light theme
- Sample CRUD page (users or posts) as reference
- README template

## 6. Project Factory Workflow (per project)

1. Copy template → new repo (e.g. `cms-app`)
2. Design schema (3–8 tables)
3. Build pages + API routes (CRUD)
4. Integrate mock services where needed
5. Seed → push to GitHub → import to Vercel → set env vars → deploy
6. Add to portfolio

**Deploy model:** each project = own repo = own Vercel deployment = own public URL. Auto-deploys on every `git push` after one-time repo import.

## 7. Flagship Project PRDs

### A. CMS (`cms-app`) → `cms-app.vercel.app`
- **Tables:** users, posts, categories, tags
- **Features:** admin CRUD posts, markdown editor, draft/publish, image upload (mock), tag/category management, search (`ILIKE`)
- **Public:** blog list, single post, category/tag pages, search page
- **Mocks:** image upload

### B. Booking (`booking-app`) → `booking-app.vercel.app`
- **Tables:** users, services, slots, bookings
- **Features:** service listing, slot calendar (available/taken), book flow, admin confirm/cancel
- **Mocks:** email (confirmation → "Email Outbox" admin page), SMS reminder, optional payment deposit
- **Acceptance:** two users can't book the same slot; booking status visible in admin

### C. Ecommerce (`shop-app`) → `shop-app.vercel.app`
- **Tables:** users, products, categories, cart_items, orders, order_items
- **Features:** catalog + filters, cart, checkout → mock payment (success/fail), order confirmation, admin orders dashboard, inventory deduction
- **Mocks:** payment, receipt email

## 8. Portfolio Shell (`portfolio-app`) → `portfolio.vercel.app`

- Grid of all projects: live link, GitHub link, tech badges, demo credentials, "uses simulated X" note per card
- One-time build, updated as projects ship

## 9. Remaining Projects (7–27, simple)

| Batch | Projects |
|---|---|
| Management | Task manager, Inventory, Expense tracker, Notes w/ tags, Library system |
| Marketplaces | Job board, Event ticketing, Restaurant ordering, Food delivery sim, Parking reservation |
| Platforms | Quiz, Polls, Forum, Ticket/feedback, URL shortener |
| Tools | Invoice generator, Budget planner, Recipe manager, Password manager (demo), Fitness logger |
| Info apps | Weather (mock API), News reader, Catalog app, Calculator suite, Portfolio builder |

## 10. Local Development Setup (verified Aug 2026)

| Tool | Status | Needed? |
|---|---|---|
| Node v24.18.0 | ✅ installed | yes |
| npm 11.18.0 | ✅ installed | yes |
| Git 2.46.1 + identity | ✅ installed | yes |
| Local Postgres | ❌ not installed | **no** — connect directly to Neon via `DATABASE_URL` (same DB for local + prod) |
| Vercel CLI | ❌ not installed | **no** for local test; yes before deploy (`npm i -g vercel` + `vercel login`) |
| PHP/Composer/Docker/Herd | — | not needed (Laravel skipped) |

Local test flow: `npm run dev` → `localhost:3000`, DB = Neon cloud (free).

## 11. Constraints & Risks

- **Vercel limits are per-account** (shared across all projects): 1M invocations/mo, 4h active CPU, 100 GB transfer — fine for portfolio, avoid heavy cron loops
- **Neon cold starts** (~500ms after 5-min idle) — acceptable, note in README
- **Hobby = personal/non-commercial** — remove anything monetized
- **Never commit secrets** — env vars in Vercel dashboard only
- **0.5 GB/project** — seed data only, no large uploads in Postgres

## 12. Roadmap

| Phase | Deliverable | Est. |
|---|---|---|
| 0 | Template `nextjs-starter` + mock services | 3–4 hrs |
| 1 | CMS app deployed | 3–4 hrs |
| 2 | Booking app deployed | 3–4 hrs |
| 3 | Ecommerce app deployed | 4–5 hrs |
| 4 | Portfolio shell + first 3 listed | 2 hrs |
| 5+ | Batch projects (per project) | ~30 min each |

## 13. Definition of Done (per project)

- Deployed on Vercel, reachable via public URL
- Seed data loaded, works with demo credentials
- Mock services documented in README
- Added to portfolio shell
- No paid usage on any platform
