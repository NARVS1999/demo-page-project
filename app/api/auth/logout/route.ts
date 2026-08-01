// POST /api/auth/logout — public by design (whitelisted in proxy.ts).

import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.delete("session");
  return response;
}
