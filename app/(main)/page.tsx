// Client-facing landing page — pitches the team's fullstack capabilities by
// demoing the blog, ecommerce, and booking apps live. Replaces the dev-facing
// project grid: static data, no DB read, so force-dynamic is not needed.
// Each capability links to the working internal route so a client can click
// through and see the real thing.

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Newspaper,
  ShoppingBag,
  CalendarClock,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { SITE } from "@/lib/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CAPABILITIES = [
  {
    title: "Content & Blog",
    description:
      "A full editorial CMS — markdown editor with live preview, categories, tags, drafts, and search. Real blog posts, real workflows.",
    href: "/blog",
    cta: "Browse the blog",
    icon: Newspaper,
  },
  {
    title: "Ecommerce",
    description:
      "A working storefront — catalog, persistent cart, mock checkout, inventory control, and an admin order console. Ready for real payments.",
    href: "/shop",
    cta: "Browse the shop",
    icon: ShoppingBag,
  },
  {
    title: "Booking",
    description:
      "Service scheduling with a live slot calendar, confirm/cancel flow, and automated email + SMS confirmations.",
    href: "/book",
    cta: "Book a service",
    icon: CalendarClock,
  },
];

const STACK = ["Next.js", "TypeScript", "Postgres", "Tailwind CSS", "shadcn/ui"];
const PROOF_POINTS = [
  "Deployed at $0 — Vercel + Neon free tiers",
  "Auth with signed session cookies",
  "120+ unit tests passing",
  "Database-backed, not static mockups",
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16">
      {/* Hero */}
      <section className="flex flex-col gap-6 py-8">
        <Badge variant="outline" className="w-fit gap-1.5">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Fullstack web apps, built end-to-end
        </Badge>
        <h1 className="max-w-3xl font-serif text-4xl font-bold tracking-tight sm:text-5xl">
          We design, build, and ship complete web applications.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          From content platforms to online stores to booking systems — every
          demo below is a live, working application backed by a real database.
          Click through and see what we can build for you.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="#capabilities">
              See what we build
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={SITE.githubUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              View the source
            </Link>
          </Button>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-3xl font-bold tracking-tight">
            Live demos you can use right now
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            No screenshots, no mockups — these are the real applications,
            connected to a live database.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {CAPABILITIES.map((cap) => (
            <Card
              key={cap.title}
              className="flex flex-col transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <cap.icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </span>
                <CardTitle className="pt-3">{cap.title}</CardTitle>
                <CardDescription>{cap.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button asChild variant="secondary" className="w-full">
                  <Link href={cap.href}>
                    {cap.cta}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Proof */}
      <section className="flex flex-col gap-6">
        <h2 className="font-serif text-3xl font-bold tracking-tight">
          Built to last, shipped to save
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PROOF_POINTS.map((point) => (
            <div
              key={point}
              className="flex items-center gap-3 rounded-xl border p-4"
            >
              <CheckCircle2
                className="h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="text-sm font-medium">{point}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {STACK.map((tech) => (
            <Badge key={tech} variant="secondary">
              {tech}
            </Badge>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-start gap-4 rounded-xl border bg-muted/40 p-8">
        <h2 className="font-serif text-2xl font-bold tracking-tight">
          Try it yourself
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          Every demo shares the same demo account — sign in and create a post,
          place an order, or book a slot.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/register">Get started</Link>
          </Button>
          <span className="font-mono text-sm text-muted-foreground">
            demo@example.com / demo1234
          </span>
        </div>
      </section>
    </div>
  );
}
