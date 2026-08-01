// POST /api/auth/register — bcrypt.hash lives ONLY here and in the seed.
// Success auto-logs-in the new user (UI-SPEC Page 3): same session cookie as login.

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { createSession } from "@/lib/session";
import { registerSchema } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid registration.", fields: parsed.error.flattenError().fieldErrors },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  try {
    const existing = await sql`SELECT 1 FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const rows = await sql`INSERT INTO users (email, name, password_hash)
      VALUES (${email}, ${name}, ${passwordHash})
      RETURNING id, email, name`;
    const user = rows[0];

    const token = await createSession({ id: user.id, email: user.email, name: user.name });
    const response = NextResponse.json({ ok: true }, { status: 201 });
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days (TMPL-02)
    });
    return response;
  } catch (error) {
    // 23505 = unique_violation — the SELECT above passed, but a concurrent
    // registration of the same email won the race. Generic 500 otherwise:
    // never leak DB state (missing table, connection, ...) to the client,
    // mirroring the login handler's generic-401 pattern (WR-03).
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
    if (code === "23505") {
      return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
    }
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
