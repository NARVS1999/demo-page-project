# Stack Research

**Domain:** Free fullstack portfolio showcase (10-30 demo apps)
**Researched:** 2026-08-01
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.12 | Fullstack framework (App Router) | App Router is the standard for 2025+; server components reduce client JS; Turbopack is now default bundler; Route Handlers replace API routes; $0 on Vercel Hobby |
| React | 19.2.8 | UI library | Required by Next.js 16; server components are first-class; React 19 features (use, actions) are stable |
| TypeScript | 5.x | Type safety | Included with `create-next-app`; catches bugs at compile time; essential for template reuse across 30 projects |
| Tailwind CSS | 4.3.3 | Utility-first CSS | v4 is CSS-native (no JS config file); `@import "tailwindcss"` in globals.css; zero-config with PostCSS plugin; instant dark mode via `dark:` prefix |
| Postgres | Neon free tier | Database | 0.5 GB/project, scale-to-zero; same DB for local + prod; no local install needed |

### Database Layer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @neondatabase/serverless | 1.1.0 | Neon Postgres driver | Official Neon driver; drop-in `pg` replacement; `neon()` function for simple queries via HTTPS (lowest latency); `Pool`/`Client` for transactions via WebSocket; zero dependencies |
| pg | 8.22.0 | PostgreSQL client (aliased) | Used via `@neondatabase/serverless` alias; standard `pg` API for Pool/Client when transactions needed |

**Why NOT `pg` directly:** The `pg` package uses TCP connections which don't work on Vercel Edge/Serverless. `@neondatabase/serverless` uses HTTPS/WebSocket, works everywhere, and is faster for one-shot queries.

### Auth & Security

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| bcryptjs | 3.0.3 | Password hashing | Pure JS, zero dependencies; works on Vercel serverless (no native bindings needed); ~30% slower than C++ bcrypt but irrelevant for demo-scale |
| jose | 6.2.6 | JWT/session token signing | Zero dependencies; works across all runtimes (Node, Edge, Browser); tree-shakeable ESM; RFC-compliant JWT; used by NextAuth.js internally |
| server-only | latest | Enforce server component boundaries | Prevents accidental import of server code in client components; fails at build time, not runtime |

**Auth pattern (no NextAuth):**
```
1. User submits credentials → POST /api/auth/login
2. Verify password with bcryptjs.compare()
3. Generate session token with jose (signed JWT or random UUID)
4. Store session in Postgres `sessions` table
5. Set httpOnly, secure cookie with session token
6. Middleware reads cookie → queries sessions table → attaches user to request
```

This is simpler than NextAuth, has zero config, and works perfectly for demo apps with a single user role.

### Validation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Zod | 4.4.3 | Input validation + type inference | TypeScript-first; zero dependencies; 2kb gzipped; infers types from schemas (no manual type definitions); works server-side in Route Handlers and client-side for form validation |

**Pattern:** Define schema in `lib/validate.ts`, use `schema.safeParse()` in Route Handlers, extract types with `z.infer<typeof schema>`.

### UI Components

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| shadcn/ui | 4.16.1 | Pre-built accessible components | Not a dependency — copies component source into your project; Tailwind-native; built on Radix UI primitives; accessible by default; customizable; no bundle bloat from unused components |
| lucide-react | 1.28.0 | Icon library | Tree-shakeable; 1500+ icons; consistent style; works with Tailwind; zero dependencies |

**Why shadcn/ui over alternatives:**
- **vs Material UI/Ant Design:** These add 100kb+ to bundle; shadcn copies ~2kb per component you actually use
- **vs Headless UI:** Headless UI is unstyled; shadcn comes styled with Tailwind
- **vs Radix UI alone:** Radix is the primitive layer; shadcn wraps it with production-ready styling
- **vs Chakra UI:** Chakra adds runtime CSS-in-JS; shadcn is pure Tailwind (static CSS)

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Turbopack | Bundler (default in Next.js 16) | 10x faster than webpack for dev; no config needed; `next dev` uses it automatically |
| ESLint | Linting | Next.js 16 no longer runs linter during `next build`; run via `npm run lint` script |
| PostCSS | CSS processing | Required by Tailwind v4; single plugin: `@tailwindcss/postcss` |

## Installation

```bash
# Create project (includes TypeScript, Tailwind, App Router, ESLint, AGENTS.md)
npx create-next-app@latest nextjs-starter --yes

# Core runtime dependencies
npm install @neondatabase/serverless zod jose bcryptjs server-only

# UI components
npx shadcn@latest init
npx shadcn@latest add button card input label dialog table badge dropdown-menu toast separator avatar

# Icons
npm install lucide-react

# Dev dependencies (already included by create-next-app)
# tailwindcss, @tailwindcss/postcss, postcss, typescript, @types/react, eslint

# Scripts to add to package.json
npm pkg set scripts.seed="npx tsx scripts/seed.ts"
npm pkg set scripts.check-db="npx tsx scripts/check-storage.ts"
```

### package.json additions

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "lint:fix": "eslint --fix",
    "seed": "npx tsx scripts/seed.ts",
    "check-db": "npx tsx scripts/check-storage.ts"
  }
}
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @neondatabase/serverless | pg (direct) | Never for Vercel — TCP connections fail on serverless; only if running on a VPS with persistent connections |
| Zod | Yup | If you need a lighter validation lib (Yup is 12kb vs Zod 2kb); but Zod's type inference is superior |
| Zod | Valibot | If bundle size is critical (Valibot is ~1kb); but Zod has larger ecosystem and better docs |
| shadcn/ui | Radix UI + custom styling | If you need full design control and don't want pre-built component styles |
| shadcn/ui | Headless UI | If you already use Tailwind and want unstyled primitives (more work, same result) |
| bcryptjs | argon2 | If you need memory-hard hashing (argon2 is more secure but requires native bindings — won't work on Vercel Hobby) |
| jose | jsonwebtoken | Never — `jsonwebtoken` has known vulnerabilities and is unmaintained; `jose` is the standard |
| Session cookies | JWT in localStorage | Never for auth tokens — httpOnly cookies are immune to XSS; localStorage is not |
| Next.js Route Handlers | tRPC | If you want end-to-end type safety between client and server; adds complexity not needed for demo apps |
| Next.js Route Handlers | Server Actions | If forms are simple and don't need custom API responses; Route Handlers are more explicit and reusable |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| NextAuth.js / Auth.js | Massive overkill for credentials-only auth; adds 50kb+ bundle; complex config for simple demo apps | Hand-rolled session with `jose` + `bcryptjs` + Postgres sessions table |
| Prisma | ORM adds 200kb+ to bundle; migration complexity; unnecessary abstraction for simple Postgres queries | Raw SQL via `@neondatabase/serverless` `neon()` tagged templates (safe from injection) |
| Drizzle ORM | Lighter than Prisma but still adds abstraction; overkill for demo apps with simple schemas | Raw SQL — schemas are 3-8 tables, SQL is readable at this scale |
| Supabase client | Adds SDK overhead; you're already using Neon directly; Supabase client expects Supabase-hosted Postgres | `@neondatabase/serverless` directly |
| Tailwind CSS v3 (JS config) | v3 uses `tailwind.config.js` (JavaScript); v4 is CSS-native with `@import "tailwindcss"` | Tailwind CSS v4 — simpler setup, smaller config, better performance |
| `jsonwebtoken` package | Known CVEs; unmaintained since 2022; NextAuth itself switched to `jose` | `jose` — actively maintained, zero dependencies, universal runtime support |
| Socket.io / WebSockets | Adds persistent connection requirement; Vercel serverless can't hold connections; burns invocation budget | Standard page refresh or `router.refresh()` for demo apps |
| Redis | Requires external service (Upstash free tier exists but adds complexity); Neon sessions work fine at demo scale | Postgres `sessions` table — simple, zero extra services |
| ESLint flat config migration | If you're on Next.js 16, the default ESLint setup works; don't waste time migrating config formats | Use whatever `create-next-app` sets up |
| React Query / SWR for data fetching | Unnecessary when using server components; adds client-side caching layer that conflicts with server-first pattern | Server components fetch directly; `use` hook for async in client components when needed |

## Stack Patterns by Variant

**If the app has a simple form (login, contact, settings):**
- Use Route Handler (`app/api/*/route.ts`) for POST
- Validate with Zod in the Route Handler
- Server component renders the form (HTML `<form>` with `action`)
- No `'use client'` needed for basic forms — use Server Actions or standard form submission

**If the app needs real-time feel (dashboard, admin panel):**
- Use server components for data display
- Add `'use client'` only on interactive elements (buttons, modals)
- Use `router.refresh()` after mutations to re-fetch server data
- Avoid `useEffect` + `fetch` — fetch in server components instead

**If the app has complex state (cart, multi-step form):**
- Keep state in URL search params (server-readable, shareable)
- Or use a single `'use client'` wrapper component with `useState`
- Never lift state to a global context for demo apps — props are fine

**If the app needs file uploads (CMS images, profile pictures):**
- Use Vercel Blob (`@vercel/blob`) for the upload endpoint
- Or store as base64 in Postgres for tiny files (< 50KB)
- Mock the upload for demo purposes — save to `uploads` table as text reference

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| next@16.2.12 | react@19.2.8, react-dom@19.2.8 | Next.js 16 requires React 19; do NOT use React 18 |
| @neondatabase/serverless@1.1.0 | pg@8.x (via alias) | If using `Pool`/`Client`, alias `pg` to `@neondatabase/serverless` in package.json |
| tailwindcss@4.3.3 | @tailwindcss/postcss@4.3.3 | Must use matching versions; v4 has no `tailwind.config.js` — config is CSS-native |
| shadcn@4.16.1 | tailwindcss@4.x, radix-ui components | shadcn CLI handles dependency installation automatically |
| zod@4.4.3 | TypeScript 5.x | Zod 4 is a major version; `z.infer` syntax unchanged from v3 |
| jose@6.2.6 | Node.js 20.9+, Edge runtimes | Universal runtime support; no compatibility issues with Vercel |
| bcryptjs@3.0.3 | Node.js 14+ | Pure JS; no native dependency issues on Vercel |

## Neon Connection Pattern

### For simple queries (one-shot, no transactions):

```typescript
// lib/db.ts
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export { sql };
```

```typescript
// Usage in Route Handler
import { sql } from '@/lib/db';

export async function GET() {
  const posts = await sql`SELECT * FROM posts ORDER BY created_at DESC`;
  return Response.json(posts);
}
```

### For transactions (multi-step operations):

```typescript
// lib/db-pool.ts
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

export function createPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}
```

```typescript
// Usage: booking creation (must be atomic)
import { createPool } from '@/lib/db-pool';

export async function POST(request: Request) {
  const pool = createPool();
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Check slot availability
      const { rows: [slot] } = await client.query(
        'SELECT * FROM slots WHERE id = $1 AND booked = false FOR UPDATE',
        [slotId]
      );
      if (!slot) throw new Error('Slot already booked');
      // Create booking
      await client.query(
        'INSERT INTO bookings (user_id, slot_id) VALUES ($1, $2)',
        [userId, slotId]
      );
      // Mark slot as booked
      await client.query('UPDATE slots SET booked = true WHERE id = $1', [slotId]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
```

**Key rule:** Use `neon()` (HTTPS) for 90% of queries. Use `Pool`/`Client` (WebSocket) only for transactions requiring `BEGIN`/`COMMIT`/`ROLLBACK`.

## Sources

- npmjs.com — verified versions: next@16.2.12, react@19.2.8, @neondatabase/serverless@1.1.0, pg@8.22.0, zod@4.4.3, shadcn@4.16.1, bcryptjs@3.0.3, jose@6.2.6, lucide-react@1.28.0, tailwindcss@4.3.3
- Next.js official docs (nextjs.org/docs) — App Router patterns, installation, Route Handlers
- Neon serverless driver docs (@neondatabase/serverless README) — neon() function, Pool/Client, WebSocket config
- Tailwind CSS v4 docs (tailwindcss.com/docs) — PostCSS plugin, CSS-native config, `@import "tailwindcss"`
- shadcn/ui docs (ui.shadcn.com) — CLI init, component installation, Radix UI primitives
- PRD.md (project-specific) — constraints, $0 hosting requirement, mock services pattern, auth decision

---

*Stack research for: Free fullstack portfolio showcase (10-30 demo apps)*
*Researched: 2026-08-01*
