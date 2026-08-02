# UI Design Contract — Phase 4: Portfolio Shell

**Phase:** 4 — Portfolio Shell
**Created:** 2026-08-03
**Status:** VERIFIED (single-pass, no revision required)
**Dimensions:** 6/6 passed

---

## Layout Structure

| Surface | Layout | Behavior |
|---------|--------|----------|
| Portfolio Page (`/`) | `AppShell` wrapper (via `(main)` route group) — `max-w-5xl` content | Replaces existing `app/(main)/page.tsx`; server component, `force-dynamic` if any DB reads |
| Project Grid | CSS Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` | Responsive: 1 col mobile, 2 col tablet, 3 col desktop |
| Page Header | Reuse `components/ui/page-header.tsx` — h1 "Projects" + description "Fullstack demo apps — deployed at $0" | Optional action slot for GitHub org link |
| Navigation | Add "Projects" to SiteHeader/MobileNav link arrays (authenticated + unauthenticated) | Home link becomes the portfolio page |

## Design System

| Token | Value | Source |
|-------|-------|--------|
| Card component | `components/ui/card.tsx` — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter | shadcn/ui |
| Badge component | `components/ui/badge.tsx` — `variant="secondary"` | shadcn/ui |
| Mock badge | `badge variant="outline"` with muted styling for "Uses simulated X" | Custom variant |
| Button component | `components/ui/button.tsx` — `variant="outline"` with `asChild` for external links | shadcn/ui |
| Section margin | Existing AppShell `py-8` with `gap-6` between page-header and grid | AppShell pattern |
| Max width | `max-w-5xl` from AppShell | Existing convention |

## Typography

| Element | Spec | Rationale |
|---------|------|-----------|
| Page title | `text-3xl font-bold tracking-tight` | Matches existing page-header pattern |
| Page description | `text-muted-foreground` | Matches existing page-header pattern |
| Card title | `CardTitle` default (text-lg font-semibold) | shadcn/ui default |
| Card description | `CardDescription` default (text-sm text-muted-foreground) | shadcn/ui default |
| Demo credentials | `text-sm font-mono` for email/password pairs | IBM Plex Mono is loaded in root layout |
| Tech badge text | `text-xs` in Badge | shadcn/ui Badge default |
| Mock note text | `text-xs text-muted-foreground` | De-emphasized |

## Color

| Usage | Token | Note |
|-------|-------|------|
| Card background | `bg-card` (shadcn/ui default) | Dark/light theme auto |
| Card border | `border` (shadcn/ui default) | Subtle separation |
| Card hover | `hover:shadow-md transition-shadow` | Interactive affordance |
| Tech badges | `badge variant="secondary"` | Neutral, non-distracting |
| Mock badges | `badge variant="outline" text-muted-foreground` | Subdued — informational not critical |
| External link icon | `text-muted-foreground` | ExternalLink lucide icon |
| GitHub link icon | `text-muted-foreground` | Github lucide icon |

## Component Contracts

### Project Card

```
┌─────────────────────────────────┐
│ Card                            │
│ ┌─────────────────────────────┐ │
│ │ CardHeader                  │ │
│ │  CardTitle: Project Name    │ │
│ │  CardDescription: One-liner │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ CardContent                 │ │
│ │  [Next.js] [TypeScript]     │ │
│ │  [Tailwind] [Postgres]      │ │
│ │  [shadcn/ui]                │ │
│ │                             │ │
│ │  Demo: email / password     │ │
│ │                             │ │
│ │  [Uses simulated payment]   │ │
│ │  [Uses simulated email]     │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ CardFooter                  │ │
│ │  [Live Demo ↗]  [GitHub ↗]  │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Card Sub-elements

| Element | Implementation | Props |
|---------|---------------|-------|
| Card wrapper | `<Card className="hover:shadow-md transition-shadow">` | Standard card base |
| CardHeader | `<CardHeader>` wrapping CardTitle + CardDescription | Default padding |
| Tech badges row | `<div className="flex flex-wrap gap-1.5">` + `<Badge variant="secondary">` | 5 badges max |
| Demo credentials | `<div className="mt-3 text-sm"><span className="font-mono">email</span> / <span className="font-mono">password</span></div>` | Monospace for clarity |
| Mock notes row | `<div className="mt-2 flex flex-wrap gap-1">` + `<Badge variant="outline">Uses simulated {service}</Badge>` | Per-project mock services |
| CardFooter | `<CardFooter className="flex gap-2">` + `<Button variant="outline" size="sm" asChild><a href="..." target="_blank" rel="noopener noreferrer">` | External links |

### Empty / Error / Loading States

| State | Implementation | Visual |
|-------|---------------|--------|
| Loading | `<Skeleton className="h-48" />` × grid count (4) inside grid | Standard shadcn skeleton |
| Error | `<ErrorState message="Could not load projects" />` — reuse `components/ui/error-state.tsx` | Existing pattern |
| Empty | Not applicable — 4 static projects, no dynamic fetch | N/A |

## Interaction States

| Element | Hover | Focus | Active |
|---------|-------|-------|--------|
| Card | `hover:shadow-md transition-shadow` | N/A (not focusable) | N/A |
| Live Demo button | `hover:bg-accent` (Button default) | `focus-visible:ring-2 ring-ring` | N/A |
| GitHub button | `hover:bg-accent` (Button default) | `focus-visible:ring-2 ring-ring` | N/A |
| External links | `target="_blank" rel="noopener noreferrer"` | Standard | N/A |

## Copywriting Contract

| Element | Copy | Notes |
|---------|------|-------|
| Page title | "Projects" | h1, simple and clear |
| Page subtitle | "Fullstack demo apps — deployed at $0" | Matches project value prop |
| Card: Template name | "ads-mediatech" | From lib/site.ts |
| Card: Template desc | "Battle-tested starter template with auth, mock services, and reference CRUD app" | Short one-liner |
| Card: CMS name | "CMS Demo" | |
| Card: CMS desc | "Blog/content management with post CRUD, markdown editor, categories, and admin dashboard" | |
| Card: Booking name | "Booking App" | |
| Card: Booking desc | "Service scheduling with slot calendar, booking flow, and mock email/SMS confirmations" | |
| Card: Ecommerce name | "Northstar Coffee" | |
| Card: Ecommerce desc | "Coffee shop storefront with catalog, cart, mock checkout, and admin order management" | |
| Demo credentials label | "Demo: user@example.com / password" | Consistently formatted per card |
| Mock badge: payment | "Uses simulated payment" | |
| Mock badge: email | "Uses simulated email" | |
| Mock badge: SMS | "Uses simulated SMS" | |
| Mock badge: OAuth | "Uses simulated OAuth" | Template only |
| Mock badge: maps | "Uses simulated maps" | Template only |
| Mock badge: storage | "Uses simulated storage" | Template only |
| Live Demo button | "Live Demo ↗" | External link |
| GitHub button | "GitHub ↗" | External link |
