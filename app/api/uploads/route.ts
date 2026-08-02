// POST /api/uploads — cover image upload via mock storage (CMS-04).
// Proxy gates /api/* (session + Origin check on non-GET), but this route
// re-verifies auth — proxy is convenience only (T-01-01-06).
// MAX_BYTES is 3 MB (RESEARCH Pitfall 1): a 4 MB file base64-inflates past
// Vercel's 4.5 MB function body limit. Never trust client-side validation.

import { NextResponse } from "next/server";
import { storage } from "@/lib/mock";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB — see Pitfall 1 vs the 4.5 MB Vercel cap

export async function POST(request: Request) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large." }, { status: 413 });
  }

  const data = Buffer.from(await file.arrayBuffer());
  const { url, size } = await storage.upload({ name: file.name, data });
  return NextResponse.json({ url, size }, { status: 201 });
}
