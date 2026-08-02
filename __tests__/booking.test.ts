// Pure helper unit tests for lib/booking.ts (TDD target — Phase 2).
// lib/booking.ts is client-safe by contract (NO "server-only"): the browser
// slot-picker/booking-dialog import formatSlotDate/formatSlotTime/formatUsd,
// server actions import depositCents, and the seed imports toDateKey.
import { describe, expect, it } from "vitest";
import {
  bookingRef,
  depositCents,
  formatSlotDate,
  formatSlotTime,
  formatUsd,
  toDateKey,
} from "@/lib/booking";

describe("bookingRef", () => {
  it("formats '#BK-' + uppercase first 4 uuid chars", () => {
    expect(bookingRef("1042abcd-1234-4111-8111-111111111111")).toBe("#BK-1042");
  });
});

describe("depositCents", () => {
  it("computes 25% in integer cents", () => {
    expect(depositCents(3000)).toBe(750);
    expect(depositCents(4500)).toBe(1125);
  });

  it("rounds to the nearest cent", () => {
    expect(depositCents(1999)).toBe(500);
  });
});

describe("toDateKey", () => {
  it("zero-pads month and day", () => {
    expect(toDateKey(new Date(2026, 7, 4))).toBe("2026-08-04");
  });

  it("keeps two-digit months as-is", () => {
    expect(toDateKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("formatSlotDate", () => {
  it("formats 'YYYY-MM-DD' as 'Tue, Aug 4' (UI-SPEC locked)", () => {
    expect(formatSlotDate("2026-08-04")).toBe("Tue, Aug 4");
  });
});

describe("formatSlotTime", () => {
  it("formats HH:MM as hour:numeric minute:2-digit", () => {
    expect(formatSlotTime("09:00")).toBe("9:00 AM");
    expect(formatSlotTime("16:00")).toBe("4:00 PM");
    expect(formatSlotTime("12:30")).toBe("12:30 PM");
    expect(formatSlotTime("00:15")).toBe("12:15 AM");
  });
});

describe("formatUsd", () => {
  it("strips a trailing '.00' for whole dollars", () => {
    expect(formatUsd(3000)).toBe("₱30");
  });

  it("keeps cents when present", () => {
    expect(formatUsd(750)).toBe("₱7.50");
    expect(formatUsd(25)).toBe("₱0.25");
  });
});
