// MOCK: Replace with real Storage. Interface must match S3/Vercel-Blob-like
// upload()/getUrl() signatures. Metadata-only persistence (name, url, size) —
// NEVER the blob itself (Pitfall 9): the url encodes the id so getUrl() can
// round-trip without storing payloads.
import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";

function assertMockMode() {
  if (env.MOCK_STORAGE === "real") {
    throw new Error("MOCK_STORAGE=real is not configured in Phase 0 — reserved for future apps.");
  }
}

export async function upload({ name, data }: { name: string; data: string }) {
  assertMockMode();
  const id = randomUUID();
  const url = `https://mock.storage/${id}/${encodeURIComponent(name)}`;
  const size = data.length;
  await sql`INSERT INTO mock_uploads (id, name, url, size_bytes)
    VALUES (${id}, ${name}, ${url}, ${size})`;
  return { url, size };
}

export async function getUrl(id: string) {
  assertMockMode();
  const rows = await sql`SELECT url FROM mock_uploads WHERE id = ${id}`;
  return rows[0]?.url ?? null;
}
