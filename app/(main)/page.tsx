// Landing page (UI-SPEC Page 1) — fully static, NO data fetch, no force-dynamic.
// Inherits the app shell from the (main) group layout. URL / unchanged.
import Link from "next/link";
import { FileText, KeyRound, PlugZap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";

const features = [
  {
    icon: <KeyRound className="h-5 w-5" aria-hidden="true" />,
    title: "Auth included",
    body: "Email + password sign-in with a signed JWT session cookie, guarded by a proxy — battle-tested, zero config.",
  },
  {
    icon: <PlugZap className="h-5 w-5" aria-hidden="true" />,
    title: "Mock services",
    body: "Payment, email, SMS, OAuth, maps, and storage simulations with DB-backed event logs you can inspect.",
  },
  {
    icon: <FileText className="h-5 w-5" aria-hidden="true" />,
    title: "CRUD reference",
    body: "A complete posts app showing ownership checks, server actions, optimistic-free mutations, and toasts.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-6 py-16">
        <div>
          <Badge>{SITE.tagline}</Badge>
        </div>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">
          Build fullstack demos. Ship for free.
        </h1>
        <p className="max-w-xl text-base text-muted-foreground">
          A battle-tested starter with auth, mock services, and a sample CRUD
          app — ready to deploy on Vercel at $0.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button size="lg" asChild className="w-full sm:w-auto">
            <Link href="/register">Get started</Link>
          </Button>
          <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto">
            <Link href="/posts">Browse posts</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-xl border p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <span className="text-muted-foreground">{feature.icon}</span>
            </div>
            <h3 className="mt-4 text-xl font-semibold tracking-tight">
              {feature.title}
            </h3>
            <p className="mt-2 text-base text-muted-foreground">
              {feature.body}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
