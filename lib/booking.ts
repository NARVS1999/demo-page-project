// lib/booking.ts — client-safe pure helpers (NO "server-only" — imported by
// the browser slot-picker/booking-dialog, by server actions, by the seed, and
// by tests). All six helpers are pure and side-effect free (TDD target).
// Locked Intl formats (UI-SPEC): formatSlotDate → "Tue, Aug 4";
// formatSlotTime → "9:00 AM". One helper per format — no ad-hoc Intl calls
// anywhere else in the phase.

/** Display-only booking reference: "#BK-" + first 4 uuid chars, uppercase. */
export function bookingRef(id: string): string {
  return `#BK-${id.slice(0, 4).toUpperCase()}`;
}

/**
 * Atomic-conflict copy (UI-SPEC Interaction 3) — the single source of truth
 * shared by the action (which returns it as FormState.message) and the dialog
 * (which detects the conflict by message equality to close + refresh + clear
 * the selection). Never edit one side without the other (IN-03).
 */
export const BOOKING_CONFLICT_MESSAGE = "That slot was just taken.";

/** 25% deposit in integer cents (UI-SPEC Interaction 4 — single source of truth). */
export function depositCents(priceCents: number): number {
  return Math.round(priceCents * 0.25);
}

/** Local YYYY-MM-DD key (zero-padded) — used by the seed and isToday computations. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * "YYYY-MM-DD" → "Tue, Aug 4". Parses into a LOCAL date (new Date(y, m-1, d) —
 * never new Date(str), which parses as UTC and drifts the weekday).
 */
export function formatSlotDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(y, m - 1, d));
}

/** "HH:MM" → "9:00 AM" / "4:00 PM" (UI-SPEC locked hour:numeric minute:2-digit). */
export function formatSlotTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2026, 0, 1, hours, minutes));
}

/** Cents → "$30" / "$7.50" / "$0.25" (trailing ".00" stripped — UI-SPEC copy). */
export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}
