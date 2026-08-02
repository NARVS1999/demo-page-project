"use client";

// Service card (client, UI-SPEC Page 1 + a11y 1): radio-style selectable card
// used in two modes — on /services the cards are nav cards ("Book this" CTA
// navigates, no selection semantics), on /book they form the radiogroup
// (role="radio" + aria-checked + arrow-key navigation; the whole card is the
// radio target). Price·duration is mono via formatUsd — the locked helpers
// only, no ad-hoc Intl.

import Link from "next/link";
import { CalendarCheck, Check } from "lucide-react";
import { formatUsd } from "@/lib/booking";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ServiceCardData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  durationMin: number;
};

export function ServiceCard(props: {
  service: ServiceCardData;
  selected: boolean;
  onSelect?: () => void;
  index?: number;
  /** Group-level: whether any radio in the group is currently selected. When
   *  nothing is selected the FIRST card is the tab stop so the group stays
   *  keyboard-reachable (WR-06 — roving tabindex needs an entry point). */
  hasSelection?: boolean;
}) {
  const { service, selected, onSelect, index = 0, hasSelection = false } = props;
  const selectable = typeof onSelect === "function";

  // Arrow-key navigation (UI-SPEC a11y 1): move focus through sibling radios
  // (Phase 1 segmented-control pattern); Tab moves into/out of the group only.
  // Enter/Space select the focused card (WR-06 — a role="radio" div does not
  // fire click on keyboard activation).
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.();
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const radios = Array.from(
      event.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
        '[role="radio"]',
      ) ?? [],
    );
    const current = radios.indexOf(event.currentTarget);
    if (current === -1) return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = (current + delta + radios.length) % radios.length;
    radios[next]?.focus();
  }

  return (
    <div
      role={selectable ? "radio" : undefined}
      aria-checked={selectable ? selected : undefined}
      tabIndex={selectable ? (selected || (index === 0 && !hasSelection) ? 0 : -1) : undefined}
      aria-label={selectable ? service.name : undefined}
      onClick={selectable ? () => onSelect() : undefined}
      onKeyDown={selectable ? handleKeyDown : undefined}
      className={cn(
        "flex h-full flex-col gap-3 border p-6",
        selectable && "cursor-pointer transition-colors",
        selectable && selected && "border-primary ring-1 ring-primary",
        selectable && !selected && "border-input",
        !selectable && "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-xl font-semibold tracking-tight">{service.name}</h3>
        {/* Selection indicator: radio circle → Check in primary when selected */}
        <span
          aria-hidden="true"
          className={cn(
            "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
            selectable && selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-transparent",
          )}
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="line-clamp-2 text-sm text-muted-foreground" title={service.description}>
        {service.description}
      </p>
      <p className="font-mono text-sm text-muted-foreground">
        {formatUsd(service.priceCents)}
        <span aria-hidden="true"> · </span>
        {service.durationMin} min
      </p>
      <div className="mt-auto pt-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/book?service=${service.slug}`}>
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            Book this
          </Link>
        </Button>
      </div>
    </div>
  );
}
