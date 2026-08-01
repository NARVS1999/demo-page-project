// MOCK: Replace with real Maps. Interface must match Google-Maps-like
// geocode()/getStaticMapUrl() signatures. Stateless: deterministic pseudo
// coordinates per address — no network calls, no API keys (no SSRF surface).
import { env } from "@/lib/validate";

function assertMockMode() {
  if (env.MOCK_MAPS === "real") {
    throw new Error("MOCK_MAPS=real is not configured in Phase 0 — reserved for future apps.");
  }
}

function seedFromString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

export async function geocode(address: string) {
  assertMockMode();
  const seed = seedFromString(address);
  // Base coords are San Francisco; jitter keeps demos stable but distinct.
  const lat = 37.7749 + (seed % 1000) / 100000;
  const lng = -122.4194 - (seed % 1000) / 100000;
  return { lat, lng, formattedAddress: `${address}, San Francisco, CA` };
}

export function getStaticMapUrl({ lat, lng }: { lat: number; lng: number }): string {
  assertMockMode();
  return `https://picsum.photos/seed/${lat.toFixed(4)},${lng.toFixed(4)}/600/400`;
}
