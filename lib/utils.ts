import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Absolute-path-only redirect target for ?next= (BL-02): rejects open redirects
// like "https://evil.com", "//evil.com", and backslash-normalized network
// paths. Returns the fallback when next is absent or unsafe. Shared by any
// page/logout flow that honors ?next=.
const TRUSTED_ORIGIN = "http://northstar.local";
const UNSAFE_NEXT_CHARACTERS = /[\\\u0000-\u001f\u007f-\u009f]/;

export function safeNextUrl(
  next: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    UNSAFE_NEXT_CHARACTERS.test(next)
  ) {
    return fallback;
  }

  try {
    const target = new URL(next, TRUSTED_ORIGIN);
    return target.origin === TRUSTED_ORIGIN ? next : fallback;
  } catch {
    return fallback;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// True for canonical UUIDs (IN-01): keeps non-UUID ids out of SQL — Postgres
// throws "invalid input syntax for type uuid" for anything else, which would
// surface as a 500 instead of the designed 404 / "This post no longer exists."
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
