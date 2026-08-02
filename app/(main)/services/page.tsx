// /services — public barber-shop service listing (UI-SPEC Page 1).
// Public by construction (the proxy matcher excludes /services); force-dynamic;
// single query ordered by created_at (stable seed insertion order: Haircut,
// Beard Trim, Haircut + Beard). Empty → "No services yet" (no CTA).

import { Scissors } from "lucide-react";
import { sql } from "@/lib/db";
import {
  ServiceCard,
  type ServiceCardData,
} from "@/components/booking/service-card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const rows = await sql`
    SELECT id, slug, name, description, price_cents, duration_min
    FROM services ORDER BY created_at ASC`;

  const services: ServiceCardData[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceCents: Number(row.price_cents),
    durationMin: Number(row.duration_min),
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="border-b-2 border-primary font-mono text-xs uppercase tracking-[0.28em] text-primary">
          The Barbershop
        </p>
        <div className="h-px w-full bg-muted-foreground/40" />
        <h1 className="font-serif text-4xl font-bold tracking-tight">Services</h1>
        <p className="text-base text-muted-foreground">
          Three cuts, fourteen days of open slots.
        </p>
      </div>

      {services.length === 0 ? (
        <EmptyState
          icon={<Scissors className="h-5 w-5" aria-hidden="true" />}
          title="No services yet"
          description="The barbershop hasn't added any services yet."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} selected={false} />
          ))}
        </div>
      )}
    </div>
  );
}
