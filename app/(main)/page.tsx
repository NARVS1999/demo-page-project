// Landing page (front page) — fully static, NO data fetch, no force-dynamic.
// Retro Japan newspaper styling: masthead, dateline, front-page hero with drop
// cap, feature columns, seal accent. Inherits the app shell from (main) group.
import Link from "next/link";
import { FileText, KeyRound, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";

const features = [
  {
    icon: <KeyRound className="h-4 w-4" aria-hidden="true" />,
    kicker: "Feature One",
    title: "Auth included",
    body: "Email and password sign-in with a signed JWT session cookie, guarded by a proxy — battle-tested, zero configuration.",
  },
  {
    icon: <PlugZap className="h-4 w-4" aria-hidden="true" />,
    kicker: "Feature Two",
    title: "Mock services",
    body: "Payment, email, SMS, OAuth, maps, and storage simulations with database-backed event logs you can inspect.",
  },
  {
    icon: <FileText className="h-4 w-4" aria-hidden="true" />,
    kicker: "Feature Three",
    title: "CRUD reference",
    body: "A complete posts app showing ownership checks, server actions, and toast notifications on every mutation.",
  },
];

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-12">
      <section>
        <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Vol. I — No. 001</span>
          <span className="hidden sm:inline">Founded 2026</span>
        </div>
        <h1 className="my-2 text-center font-serif text-4xl font-bold uppercase tracking-[0.16em] sm:text-5xl">
          The Daily <em className="font-serif italic">&amp;</em> Showcase
        </h1>
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          {SITE.tagline}
        </p>
        <div className="mt-4 border-y-4 border-double border-foreground" />
        <div className="flex flex-col items-center justify-between gap-1 border-b border-foreground py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:flex-row">
          <span>{today}</span>
          <span className="font-bold text-primary">Evening Edition</span>
          <span>Price: $0.00</span>
        </div>
      </section>

      <section className="grid grid-cols-[1fr_24px] gap-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5">
            <span className="inline-block w-fit border-b-2 border-primary pb-1 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
              Front Page
            </span>
            <h2 className="max-w-2xl font-serif text-4xl font-extrabold leading-none tracking-tight sm:text-6xl">
              Build fullstack demos. <em className="text-primary italic">Ship for free.</em>
            </h2>
            <p className="max-w-xl text-lg italic text-muted-foreground">
              A battle-tested starter with auth, mock services, and a sample
              CRUD app — ready to deploy on Vercel at $0.
            </p>
            <p className="max-w-2xl first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-5xl first-letter:font-bold first-letter:leading-[0.8] first-letter:text-primary">
              Every project ships end-to-end without spending a cent.
              Authentication, a real database, simulated payment and messaging,
              and a complete reference application — all bundled into one
              reusable template that turns every new demo into a
              thirty-minute build.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="lg" asChild>
                <Link href="/register">Get started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/posts">Browse posts</Link>
              </Button>
              <span
                aria-hidden="true"
                className="-rotate-3 rounded-sm bg-primary px-2.5 py-2 text-center font-mono text-[10px] font-bold uppercase leading-tight tracking-[0.06em] text-primary-foreground shadow-[2px_2px_0_rgba(0,0,0,0.18)]"
              >
                Free<br />Forever
              </span>
            </div>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="hidden justify-self-end border-r border-muted-foreground/40 pr-3 [writing-mode:vertical-rl] font-mono text-[10px] uppercase tracking-[0.34em] text-muted-foreground md:block"
        >
          Built Free — Shipped Free — Open to the Public
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
            Features
          </span>
          <div className="h-px flex-1 bg-muted-foreground/40" />
        </div>
        <div className="grid gap-6 md:grid-cols-3 md:gap-0">
          {features.map((feature, i) => (
            <article
              key={feature.title}
              className={`flex flex-col gap-3 px-4 py-2 md:px-5 ${i > 0 ? "md:border-l md:border-muted-foreground/40" : "md:pl-0"}`}
            >
              <div className="flex items-center gap-2 text-primary">
                {feature.icon}
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em]">
                  {feature.kicker}
                </span>
              </div>
              <div className="h-px w-full bg-muted-foreground/40" />
              <h3 className="font-serif text-2xl font-bold leading-tight">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="flex items-start gap-4 border border-muted-foreground/40 bg-muted/40 p-5">
        <span className="pt-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
          Correspondence
        </span>
        <p className="text-sm text-muted-foreground">
          Demo credentials: <code className="border border-muted-foreground/40 bg-background px-1.5 py-0.5 font-mono text-xs">demo@example.com</code>{" "}
          / <code className="border border-muted-foreground/40 bg-background px-1.5 py-0.5 font-mono text-xs">demo1234</code>.
          All external services are simulated — no real payments, no real
          emails, no credit cards required.
        </p>
      </section>
    </div>
  );
}
