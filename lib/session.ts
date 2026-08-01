import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { cookies } from "next/headers";
import { env } from "@/lib/validate";

const secret = new TextEncoder().encode(env.SESSION_SECRET);

export async function createSession(user: {
  id: string;
  email: string;
  name: string;
}) {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

// Returns the JWT payload, or null on ANY failure (missing, expired, tampered,
// wrong secret) — every failure is treated as logged out.
export async function verifySession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

// Session DTO for server components/actions — zero DB calls (JWT is the source
// of truth). react cache() dedupes per request.
export const getCurrentUser = cache(async () => {
  const s = await verifySession((await cookies()).get("session")?.value);
  if (!s) return null;
  return { id: s.sub!, email: s.email as string, name: s.name as string };
});
