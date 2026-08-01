// @vitest-environment node
// jose's instanceof Uint8Array checks fail under the jsdom window realm;
// session logic is DOM-free (next/headers is mocked), so node env is correct.
import { SignJWT } from "jose";
import { describe, expect, it, vi } from "vitest";

// Shared cookie store for the next/headers mock (vi.mock is hoisted).
const cookieStore = vi.hoisted(() => ({
  value: undefined as string | undefined,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "session" && cookieStore.value
        ? { value: cookieStore.value }
        : undefined,
  })),
}));

import { createSession, verifySession } from "@/lib/session";

const { env } = await import("@/lib/validate");

function signWith(secret: string, claims: Record<string, string>) {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(new TextEncoder().encode(secret));
}

describe("createSession / verifySession", () => {
  it("round-trips a signed session with sub/email/name and ~30-day expiry (HS256)", async () => {
    const token = await createSession({
      id: "user-123",
      email: "demo@example.com",
      name: "Demo User",
    });

    // HS256 header
    const header = JSON.parse(
      Buffer.from(token.split(".")[0], "base64url").toString(),
    );
    expect(header.alg).toBe("HS256");

    const payload = await verifySession(token);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe("user-123");
    expect(payload!.email).toBe("demo@example.com");
    expect(payload!.name).toBe("Demo User");
    expect(payload!.exp! - payload!.iat!).toBeGreaterThanOrEqual(
      30 * 24 * 60 * 60 - 60,
    );
    expect(payload!.exp! - payload!.iat!).toBeLessThanOrEqual(
      30 * 24 * 60 * 60 + 60,
    );
  });

  it("returns null for a tampered token", async () => {
    const token = await createSession({
      id: "user-123",
      email: "demo@example.com",
      name: "Demo User",
    });
    const tampered =
      token.slice(0, -4) + (token.slice(-4) === "AAAA" ? "BBBB" : "AAAA");
    expect(await verifySession(tampered)).toBeNull();
  });

  it("returns null for a token signed with a different secret", async () => {
    const token = await signWith(
      "a-completely-different-secret-0123456789abcdef0123456789abcdef",
      { sub: "user-123", email: "demo@example.com", name: "Demo User" },
    );
    expect(await verifySession(token)).toBeNull();
  });

  it("returns null for undefined input", async () => {
    expect(await verifySession(undefined)).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const token = await new SignJWT({ email: "demo@example.com", name: "Demo User" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-123")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 60 * 60)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(env.SESSION_SECRET));
    expect(await verifySession(token)).toBeNull();
  });
});

describe("getCurrentUser", () => {
  it("returns null when the session cookie is absent", async () => {
    cookieStore.value = undefined;
    vi.resetModules();
    const { getCurrentUser } = await import("@/lib/session");
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns {id, email, name} when a valid session cookie is present", async () => {
    const token = await signWith(env.SESSION_SECRET, {
      sub: "user-456",
      email: "alice@example.com",
      name: "Alice",
    });
    cookieStore.value = token;
    vi.resetModules();
    const { getCurrentUser } = await import("@/lib/session");
    expect(await getCurrentUser()).toEqual({
      id: "user-456",
      email: "alice@example.com",
      name: "Alice",
    });
  });
});
