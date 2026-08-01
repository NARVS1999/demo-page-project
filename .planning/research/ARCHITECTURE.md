# Architecture Research

**Domain:** Multi-project fullstack portfolio (10-30 demo apps)
**Researched:** 2026-08-01
**Confidence:** HIGH

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Portfolio Ecosystem                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  CMS App    │  │ Booking App │  │  Shop App   │  ... (N)    │
│  │  (standalone repo) │  │  (standalone repo) │  │  (standalone repo) │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                      │
├─────────┴────────────────┴────────────────┴─────────────────────┤
│                    Deployment Layer (Vercel)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Portfolio Shell (portfolio-app)              │    │
│  │    Grid: live links, GitHub links, tech badges, creds   │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                      Data Layer (Neon Postgres)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  CMS DB     │  │ Booking DB  │  │  Shop DB    │  ... (N)   │
│  │ (0.5 GB)    │  │ (0.5 GB)    │  │ (0.5 GB)    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `nextjs-starter` | Reusable template with auth, DB, mocks, theme | Copy per project, extend with domain logic |
| `app/api/*` | Backend routes (CRUD, auth, business logic) | Next.js Route Handlers (Web Request/Response) |
| `lib/db.ts` | Database connection pool | `@neondatabase/serverless` Pool (WebSocket) |
| `lib/mock/*` | Swappable external service mocks | TypeScript modules with standard interfaces |
| `lib/session.ts` | Session management | Cookie-based, stored in Postgres |
| `lib/auth.ts` | Route protection | Middleware helper for protected routes |
| Portfolio Shell | Aggregates all projects | Static grid with dynamic links |

## Recommended Project Structure

```
nextjs-starter/                    # Template (Phase 0)
├── app/
│   ├── layout.tsx                 # Root layout (dark/light theme, nav)
│   ├── page.tsx                   # Homepage
│   ├── loading.tsx                # Global loading skeleton
│   ├── error.tsx                  # Global error boundary
│   ├── not-found.tsx              # 404 page
│   │
│   ├── (auth)/                    # Auth pages (route group)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   │
│   ├── dashboard/                 # Protected dashboard
│   │   └── page.tsx
│   │
│   └── api/                       # Backend API routes
│       ├── auth/
│       │   ├── login/route.ts     # POST: verify credentials
│       │   ├── register/route.ts  # POST: create user
│       │   └── logout/route.ts    # POST: clear session
│       └── ... (project-specific)
│
├── lib/
│   ├── db.ts                      # Neon Pool + connection
│   ├── session.ts                 # Session cookie helpers
│   ├── auth.ts                    # Route protection
│   ├── validate.ts                # Input validation (zod)
│   └── mock/                      # Mock services
│       ├── index.ts               # Export all mocks
│       ├── payment.ts             # Mock payment provider
│       ├── email.ts               # Mock email provider
│       ├── sms.ts                 # Mock SMS provider
│       ├── oauth.ts               # Mock OAuth provider
│       ├── maps.ts                # Mock maps provider
│       └── storage.ts             # Mock file storage
│
├── components/                    # Shared UI components
│   ├── ui/                        # Base UI (Button, Input, Card)
│   └── layout/                    # Layout components (Header, Sidebar)
│
├── scripts/
│   └── seed.ts                    # Demo data seeder
│
├── .env.local                     # DATABASE_URL (not committed)
├── .env.example                   # Template for env vars
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### Project-Specific Extension

When creating a new project (e.g., `cms-app`):

```
cms-app/                            # Derived from nextjs-starter
├── app/
│   ├── api/
│   │   ├── posts/route.ts         # GET list, POST create
│   │   ├── posts/[id]/route.ts    # GET one, PUT update, DELETE
│   │   ├── categories/route.ts    # Project-specific routes
│   │   └── tags/route.ts
│   │
│   ├── (main)/                    # Project-specific route group
│   │   ├── posts/page.tsx         # Public post list
│   │   ├── posts/[slug]/page.tsx  # Single post view
│   │   └── search/page.tsx
│   │
│   └── admin/                     # Admin section
│       ├── posts/page.tsx
│       └── layout.tsx
│
├── lib/
│   ├── db/                        # Project-specific queries
│   │   ├── posts.ts               # getPosts, getPost, createPost
│   │   ├── categories.ts
│   │   └── tags.ts
│   └── mock/
│       └── storage.ts             # Override: use Vercel Blob
│
├── scripts/
│   └── seed.ts                    # Extend with posts, categories, tags
│
└── schema.sql                     # Project-specific tables
```

## Architectural Patterns

### Pattern 1: Template Derivation

**What:** Each project copies `nextjs-starter` and extends it with domain-specific code.
**When to use:** Always — this is the core workflow.
**Trade-offs:**
- ✅ Fast setup (~30 min per project)
- ✅ Consistent auth, DB, mocks across all projects
- ❌ No shared code updates (each repo is independent)
- ❌ Template improvements require manual propagation

**Example:**
```bash
# Create new project from template
cp -r nextjs-starter cms-app
cd cms-app
# Remove .git, re-init
rm -rf .git && git init
# Add project-specific routes
mkdir -p app/api/posts app/\(main\)/posts
# Extend seed script with domain data
```

### Pattern 2: Service Provider Interface

**What:** Mock services implement a standard interface, swappable without touching business logic.
**When to use:** Any external integration (payments, email, SMS, OAuth, maps, storage).
**Trade-offs:**
- ✅ Business logic stays clean (no conditional mock/real checks)
- ✅ Easy to swap to real services later
- ❌ Slight overhead of interface definitions
- ❌ Must keep mock behavior realistic

**Example:**
```typescript
// lib/mock/payment.ts
export interface PaymentProvider {
  charge(amount: number, currency: string): Promise<PaymentResult>;
  refund(transactionId: string): Promise<RefundResult>;
}

export const mockPayment: PaymentProvider = {
  async charge(amount, currency) {
    // Simulate 3s processing delay
    await new Promise(r => setTimeout(r, 3000));
    // Success/fail toggle via env var
    if (process.env.MOCK_PAYMENT_FAIL === 'true') {
      return { success: false, error: 'Simulated failure' };
    }
    return {
      success: true,
      transactionId: `txn_${Date.now()}`,
      amount,
      currency,
    };
  },
  async refund(transactionId) {
    return { success: true, transactionId };
  },
};

// lib/mock/index.ts
export { mockPayment } from './payment';
export { mockEmail } from './email';
export { mockSms } from './sms';
// ... etc
```

### Pattern 3: Isolated Database per Project

**What:** Each project gets its own Neon database (0.5 GB limit).
**When to use:** Always — no shared databases.
**Trade-offs:**
- ✅ Complete isolation (no cross-project conflicts)
- ✅ Simple env vars (one DATABASE_URL per project)
- ✅ Easy to delete/recreate individual projects
- ❌ No cross-project queries (not needed for portfolio)
- ❌ Must manage N Neon projects

**Example:**
```typescript
// lib/db.ts — identical across all projects
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;

// Usage in Route Handler
import pool from '@/lib/db';

export async function GET() {
  const { rows } = await pool.query('SELECT * FROM posts');
  return Response.json(rows);
}
```

## Data Flow

### Request Flow

```
Browser (React Component)
    ↓ fetch('/api/posts')
Next.js Route Handler (app/api/posts/route.ts)
    ↓ validates input (lib/validate.ts)
    ↓ checks auth (lib/auth.ts)
lib/db.ts (Neon Pool)
    ↓ pool.query('SELECT ...')
Neon Postgres (cloud)
    ↓ rows
Route Handler
    ↓ transforms response
Browser
    ↓ renders UI
```

### Auth Flow

```
Login Page (app/(auth)/login/page.tsx)
    ↓ POST /api/auth/login { email, password }
Route Handler (app/api/auth/login/route.ts)
    ↓ validates credentials against DB
    ↓ creates session (lib/session.ts)
    ↓ sets httpOnly cookie
Browser
    ↓ redirects to /dashboard
Dashboard Page (app/dashboard/page.tsx)
    ↓ reads session from cookie (lib/auth.ts)
    ↓ fetches protected data from /api/...
```

### Mock Service Flow

```
Business Logic (e.g., checkout)
    ↓ calls mockPayment.charge(amount, currency)
lib/mock/payment.ts
    ↓ simulates delay (3s)
    ↓ logs to DB (optional)
    ↓ returns success/fail
Business Logic
    ↓ handles result
    ↓ sends mock confirmation email
lib/mock/email.ts
    ↓ saves to 'emails' table
    ↓ admin can view in "Email Outbox" page
```

## Scaling Considerations

| Scale | Architecture | Notes |
|-------|--------------|-------|
| 1-10 projects | Current design | Template copy, separate repos, separate DBs |
| 10-30 projects | Current design | Same — Vercel Hobby handles unlimited projects |
| 30+ projects | Consider monorepo | If maintenance burden grows, use Turborepo |

### Scaling Priorities

1. **First bottleneck:** Template drift (improvements don't propagate)
   - **Fix:**定期更新模板文档，手动同步关键改进
2. **Second bottleneck:** Neon project management (creating/managing 30 DBs)
   - **Fix:**脚本化 Neon project creation (API available)
3. **Third bottleneck:** Vercel account limits (1M invocations/mo shared)
   - **Fix:** 不太可能达到 — 每个项目流量很低

## Anti-Patterns

### Anti-Pattern 1: Monorepo for Portfolio Projects

**What people do:** Put all 30 projects in one repo with shared code.
**Why it's wrong:** Violates the "separate repo per project" decision. Makes deployment complex. Shared code changes break multiple projects.
**Do this instead:** Copy template per project. Accept code duplication. Keep projects independent.

### Anti-Pattern 2: Conditional Mock/Real Checks in Business Logic

**What people do:** `if (process.env.NODE_ENV === 'production') { useRealPayment() } else { useMockPayment() }`
**Why it's wrong:** Business logic becomes coupled to deployment environment. Hard to test. Hard to swap later.
**Do this instead:** Always call `mockPayment.charge()`. To use real payment, swap the implementation in `lib/mock/payment.ts`.

### Anti-Pattern 3: Shared Database Across Projects

**What people do:** One Neon project, different schemas per project.
**Why it's wrong:** Hits 0.5 GB limit faster. Complex env vars. Cross-project contamination risk.
**Do this instead:** One Neon project per app. One DATABASE_URL per project. Complete isolation.

### Anti-Pattern 4: Skipping Seed Scripts

**What people do:** "I'll add test data manually later."
**Why it's wrong:** Demo apps must work immediately on deploy. Manual data entry doesn't scale to 30 projects.
**Do this instead:** Every project ships with `npm run seed` that populates realistic demo data.

## Integration Points

### External Services

| Service | Integration | Notes |
|---------|-------------|-------|
| Vercel | Git push → auto deploy | One-time repo import, then automatic |
| Neon | `DATABASE_URL` env var | 0.5 GB/project, scale-to-zero |
| GitHub | Source control | One repo per project |
| Vercel Blob | File storage (optional) | 1 GB free, use for uploads |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend ↔ API | fetch() + JSON | React Server Components for reads, Client Components for writes |
| API ↔ Database | Neon Pool (WebSocket) | Connection pooling, scale-to-zero |
| API ↔ Mock Services | Direct import | `import { mockPayment } from '@/lib/mock'` |
| Portfolio Shell ↔ Projects | Static links | No runtime communication |

## Build Order

### Phase 0: Template (nextjs-starter)
**Depends on:** Nothing
**Delivers:** Reusable foundation
**Key files:**
- `lib/db.ts` — Neon Pool connection
- `lib/session.ts` — Session management
- `lib/mock/*` — All 6 mock services
- `app/api/auth/*` — Login, register, logout
- `app/(auth)/*` — Auth pages
- `components/ui/*` — Base UI components
- `scripts/seed.ts` — Demo data seeder

### Phase 1: CMS App
**Depends on:** Phase 0 (template)
**Delivers:** First real project, validates template
**Key files:**
- `app/api/posts/*` — Post CRUD
- `app/api/categories/*` — Category management
- `app/api/tags/*` — Tag management
- `app/(main)/*` — Public pages
- `app/admin/*` — Admin dashboard
- `lib/db/posts.ts` — Post queries
- `schema.sql` — users, posts, categories, tags

### Phase 2: Booking App
**Depends on:** Phase 0 (template)
**Delivers:** Second project, tests mock services
**Key files:**
- `app/api/services/*` — Service listing
- `app/api/slots/*` — Slot management
- `app/api/bookings/*` — Booking flow
- `lib/mock/email.ts` — Email confirmation
- `lib/mock/sms.ts` — SMS reminder
- `schema.sql` — users, services, slots, bookings

### Phase 3: Ecommerce App
**Depends on:** Phase 0 (template)
**Delivers:** Third project, complex mock integration
**Key files:**
- `app/api/products/*` — Product catalog
- `app/api/cart/*` — Cart management
- `app/api/orders/*` — Order flow
- `lib/mock/payment.ts` — Mock checkout
- `schema.sql` — users, products, categories, cart_items, orders, order_items

### Phase 4: Portfolio Shell
**Depends on:** Phases 1-3 (need at least 3 projects to list)
**Delivers:** Public showcase
**Key files:**
- `app/page.tsx` — Grid of all projects
- `lib/projects.ts` — Project metadata (links, tech, creds)

### Phase 5+: Batch Projects
**Depends on:** Phase 0 (template)
**Delivers:** 7-27 additional apps (~30 min each)
**Pattern:** Copy template → add domain routes → extend seed → deploy

## Source Authority

| Claim | Source | Confidence |
|-------|--------|------------|
| Neon serverless driver uses HTTP/WebSockets | neon.tech/docs | HIGH |
| Route Handlers use Web Request/Response | nextjs.org/docs | HIGH |
| Vercel Hobby: unlimited projects, 1M invocations | vercel.com/pricing | HIGH |
| Neon free tier: 0.5 GB/project | neon.tech/pricing | HIGH |
| Template derivation pattern | PRD Section 6 | HIGH |

---
*Architecture research for: Free Fullstack Showcase (30 Portfolio Projects)*
*Researched: 2026-08-01*
