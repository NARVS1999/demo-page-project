"use client";

// Admin booking filters (client, UI-SPEC Page 4 + Interaction 9): plain GET
// form to /admin/bookings — server-rendered filtered results, no client
// fetch (Phase 1 search pattern). Two native selects (Status, Service) with
// Label htmlFor pairs, defaultValue from the current searchParams, auto-submit
// via onChange → form.submit(). "Clear filters" ghost link shown only when a
// filter is active. NOTE: needs "use client" for the onChange auto-submit —
// a server component cannot attach handlers (PATTERNS.md classifies it client).

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function BookingFilters({
  current,
  services,
}: {
  current: { status: string; service: string };
  services: { slug: string; name: string }[];
}) {
  const filtersActive = current.status !== "all" || current.service !== "all";

  return (
    <form
      method="GET"
      action="/admin/bookings"
      className="flex flex-wrap items-end gap-4 border-b border-border bg-card px-4 py-3"
    >
      <div className="flex w-full flex-col gap-2 sm:w-auto">
        <Label htmlFor="booking-status">Status</Label>
        <select
          id="booking-status"
          name="status"
          defaultValue={current.status}
          onChange={(event) => event.currentTarget.form?.submit()}
          className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm sm:w-auto"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto">
        <Label htmlFor="booking-service">Service</Label>
        <select
          id="booking-service"
          name="service"
          defaultValue={current.service}
          onChange={(event) => event.currentTarget.form?.submit()}
          className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm sm:w-auto"
        >
          <option value="all">All services</option>
          {services.map((service) => (
            <option key={service.slug} value={service.slug}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      {filtersActive && (
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/bookings">Clear filters</Link>
        </Button>
      )}
    </form>
  );
}
