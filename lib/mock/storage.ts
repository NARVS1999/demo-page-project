import "server-only";

// Storage abstraction — the one file call sites never touch.
//   mock: metadata-only persistence (name, url, size) — NEVER the blob
//         (Pitfall 9): the url encodes the id so getUrl() round-trips without
//         storing payloads.
//   real: MOCK_STORAGE=real uploads the actual bytes to Vercel Blob and
//         returns a public, real URL. Requires BLOB_READ_WRITE_TOKEN.
// Swapping providers replaces this file, never the call sites.
import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";

function isRealMode() {
  return env.MOCK_STORAGE === "real";
}

export async function upload({ name, data }: { name: string; data: string | Buffer }) {
  if (isRealMode()) {
    if (!env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("MOCK_STORAGE=real requires BLOB_READ_WRITE_TOKEN.");
    }
    const { put } = await import("@vercel/blob");
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data, "base64");
    const { url } = await put(name, bytes, {
      access: "public",
      token: env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
    });
    return { url, size: bytes.byteLength };
  }

  const id = randomUUID();
  const url = `https://mock.storage/${id}/${encodeURIComponent(name)}`;
  const size = Buffer.isBuffer(data) ? data.byteLength : data.length;
  await sql`INSERT INTO mock_uploads (id, name, url, size_bytes)
    VALUES (${id}, ${name}, ${url}, ${size})`;
  return { url, size };
}

export async function getUrl(id: string) {
  const rows = await sql`SELECT url FROM mock_uploads WHERE id = ${id}`;
  if (rows.length === 0) return null;
  if (isRealMode()) {
    if (!env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("MOCK_STORAGE=real requires BLOB_READ_WRITE_TOKEN.");
    }
    const { head } = await import("@vercel/blob");
    const blob = await head(rows[0].url, { token: env.BLOB_READ_WRITE_TOKEN });
    return blob?.url ?? rows[0].url;
  }
  return rows[0].url;
}
