"use client";

// Slot picker (client, UI-SPEC Page 2 + Interaction 10 + a11y 2): the rolling
// 14-day availability list. The server page fetches and groups the days
// (LEFT JOIN bookings WHERE status <> 'cancelled' over CURRENT_DATE..+13) and
// passes days[] as props — selection here is pure client state (no fetch per
// click). Pills: available-idle / available-selected (primary + Check) /
// taken (disabled + muted, never line-through). Guest clicking an available
// pill → /login?next=/book (availability stays visible — only selection is
// gated, Interaction 5). Same-pill click toggles the selection off.

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { formatSlotDate, formatSlotTime } from "@/lib/booking";
import { cn } from "@/lib/utils";

export type SlotOption = { id: string; time: string; taken: boolean };

export type SlotDay = {
  date: string; // YYYY-MM-DD
  isToday: boolean;
  slots: SlotOption[];
};

export function SlotPicker({
  serviceSlug,
  selectedSlotId,
  onSelect,
  guest,
  days,
}: {
  serviceSlug: string;
  selectedSlotId: string | null;
  onSelect: (slot: { id: string; time: string; date: string } | null) => void;
  guest: boolean;
  days: SlotDay[];
}) {
  const router = useRouter();

  function handleClick(slot: SlotOption, date: string) {
    if (slot.taken) return;
    if (guest) {
      router.push("/login?next=/book");
      return;
    }
    // Toggle: clicking the selected pill again clears the selection.
    onSelect(selectedSlotId === slot.id ? null : { id: slot.id, time: slot.time, date });
  }

  return (
    <div className="flex flex-col gap-6" aria-label={`Open slots for ${serviceSlug}`}>
      {days.map((day) => {
        // "Tue, Aug 4" → weekday foreground + date muted (one helper, split
        // on the comma — no ad-hoc Intl formats).
        const [weekday, datePart] = formatSlotDate(day.date).split(",");
        return (
          <section key={day.date} className="flex flex-col gap-2">
            <h2 className="flex items-baseline gap-2 font-mono text-xs uppercase tracking-[0.12em]">
              <span className="font-semibold text-foreground">{weekday}</span>
              <span className="text-muted-foreground">,{datePart}</span>
              {day.isToday && <span className="text-primary">Today</span>}
            </h2>
            <div className="flex flex-wrap gap-2">
              {day.slots.map((slot) => {
                const selected = selectedSlotId === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={slot.taken}
                    title={slot.taken ? "Already booked" : undefined}
                    aria-pressed={selected}
                    aria-label={`${formatSlotTime(slot.time)} — ${
                      slot.taken ? "taken" : "available"
                    }`}
                    onClick={() => handleClick(slot, day.date)}
                    className={cn(
                      "flex min-h-10 items-center gap-2 rounded-md px-3 py-2 font-mono text-sm transition-colors motion-reduce:transition-none",
                      slot.taken
                        ? "border border-border bg-muted text-muted-foreground"
                        : selected
                          ? "border border-primary bg-primary text-primary-foreground"
                          : "border border-input bg-card text-foreground hover:border-primary/60 hover:bg-secondary",
                    )}
                  >
                    {selected && <Check className="h-[14px] w-[14px]" aria-hidden="true" />}
                    {formatSlotTime(slot.time)}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
