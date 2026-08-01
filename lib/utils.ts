import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Absolute-path-only redirect target for ?next= (WR-01): rejects open redirects
// like "https://evil.com" or "//evil.com". Returns the fallback when next is
// absent or unsafe. Shared by any page/logout flow that honors ?next=.
export function safeNextUrl(
  next: string | null | undefined,
  fallback = "/dashboard",
): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
