"use client";

// Booking flow (client): hosts the single-page booking state machine (UI-SPEC
// Interaction 1). The /book server page fetches services + the availability
// days[] and this component owns the selection state shared across the three
// steps: service radiogroup (?service= preselect from the URL), slot-picker
// (pure client state — no fetch per click), and the confirm bar (sticky on
// mobile, inline right-aligned on md+). Changing the service clears the
// selected slot (slots are per-service). The confirm bar opens the
// booking-dialog (wired in plan 02-02 Task 3).

import * as React from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { formatSlotDate, formatSlotTime } from "@/lib/booking";
import {
  ServiceCard,
  type ServiceCardData,
} from "@/components/booking/service-card";
import { SlotPicker, type SlotDay } from "@/components/booking/slot-picker";
import { BookingDialog } from "@/components/booking/booking-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export type SelectedSlot = { id: string; time: string; date: string };

export function BookingFlow({
  services,
  selectedServiceSlug,
  days,
  guest,
}: {
  services: ServiceCardData[];
  selectedServiceSlug: string | null;
  days: SlotDay[];
  guest: boolean;
}) {
  const [selectedService, setSelectedService] = React.useState<ServiceCardData | null>(
    () => services.find((s) => s.slug === selectedServiceSlug) ?? null,
  );
  const [selectedSlot, setSelectedSlot] = React.useState<SelectedSlot | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  function handleServiceSelect(service: ServiceCardData) {
    setSelectedService(service);
    setSelectedSlot(null); // slots are per-service — clear on change (UI-SPEC)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Step 1 — Service */}
      <section className="flex flex-col gap-4" aria-labelledby="book-step-service">
        <h2
          id="book-step-service"
          className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground"
        >
          <span className="text-primary">1</span> · Service
        </h2>
        <div
          role="radiogroup"
          aria-label="Choose a service"
          className="grid gap-4 md:grid-cols-3"
        >
          {services.map((service, index) => (
            <ServiceCard
              key={service.id}
              service={service}
              selected={selectedService?.id === service.id}
              onSelect={() => handleServiceSelect(service)}
              index={index}
            />
          ))}
        </div>
      </section>

      {/* Step 2 — Date & time */}
      <section className="flex flex-col gap-4" aria-labelledby="book-step-time">
        <h2
          id="book-step-time"
          className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground"
        >
          <span className="text-primary">2</span> · Date &amp; time
        </h2>
        {!selectedService ? (
          <p className="text-base text-muted-foreground">
            Choose a service above to see open slots.
          </p>
        ) : days.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-5 w-5" aria-hidden="true" />}
            title="No slots available"
            description="No open times in the next 14 days for this service."
            action={
              <Button asChild>
                <Link href="/services">Browse services</Link>
              </Button>
            }
          />
        ) : (
          <SlotPicker
            serviceSlug={selectedService.slug}
            selectedSlotId={selectedSlot?.id ?? null}
            onSelect={setSelectedSlot}
            guest={guest}
            days={days}
          />
        )}
      </section>

      {/* Step 3 — Confirm bar (shown only when a slot is selected) */}
      {selectedService && selectedSlot && (
        <section aria-label="Confirm booking" className="md:flex md:justify-end">
          <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-border bg-background/95 p-4 backdrop-blur motion-reduce:transition-none md:mx-0 md:static md:flex-row md:items-center md:gap-4 md:border-0 md:bg-transparent md:p-0">
            <p className="font-mono text-sm">
              {selectedService.name}
              <span aria-hidden="true"> · </span>
              {formatSlotDate(selectedSlot.date)}
              <span aria-hidden="true"> · </span>
              {formatSlotTime(selectedSlot.time)}
            </p>
            <Button className="w-full md:w-auto" onClick={() => setDialogOpen(true)}>
              Confirm booking
            </Button>
          </div>
        </section>
      )}

      {/* Step 3b — Confirm dialog (booking-dialog, plan 02-02 Task 3) */}
      {selectedService && selectedSlot && (
        <BookingDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          service={{ name: selectedService.name }}
          slot={selectedSlot}
          price={selectedService.priceCents}
          onConflict={() => setSelectedSlot(null)}
        />
      )}
    </div>
  );
}
