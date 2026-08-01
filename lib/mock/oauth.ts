// MOCK: Replace with real OAuth. Interface must match Google-OAuth-like
// getAuthUrl()/exchangeCode() signatures. Stateless by design: exchangeCode
// auto-logs-in the demo user (locked decision) and returns an opaque token —
// no DB persistence.
import { env } from "@/lib/env";

function assertMockMode() {
  if (env.MOCK_OAUTH === "real") {
    throw new Error("MOCK_OAUTH=real is not configured in Phase 0 — reserved for future apps.");
  }
}

export function getAuthUrl(): string {
  assertMockMode();
  return "https://accounts.example.com/oauth2/authorize?client_id=mock-demo&redirect_uri=%2F&response_type=code";
}

export async function exchangeCode(code: string) {
  assertMockMode();
  return {
    user: { email: "demo@example.com", name: "Demo User" },
    accessToken: `mock-access-token-${code}`,
  };
}
