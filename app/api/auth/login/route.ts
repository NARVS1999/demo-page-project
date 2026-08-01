// POST /api/auth/login — the ONLY place bcrypt.compare runs (never proxy.ts).
// Deliberate 401 behavior: ANY DB error in the lookup — including "relation
// users does not exist" before `npm run seed` — returns the same generic 401 as
// bad credentials, so pre-seed probes are deterministic and DB state is never
// enumerable (a 500 would leak whether the table exists).

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email or password.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  let user: { id: string; email: string; name: string; password_hash: string } | undefined;
  try {
    const rows = await sql`SELECT id, email, name, password_hash FROM users WHERE email = ${email}`;
    user = rows[0] as
      | { id: string; email: string; name: string; password_hash: string }
      | undefined;
  } catch {
    // Any DB error (missing table, connection, ...) → same generic 401.
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await createSession({ id: user.id, email: user.email, name: user.name });
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days (TMPL-02)
  });
  return response;
}
