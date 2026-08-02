// Mock service tests — vi.mock("@/lib/db") stubs `sql` (the neon query function
// is just an async function, trivially mockable). No live DB in unit tests.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSql } = vi.hoisted(() => ({
  mockSql: vi.fn(async (..._args: unknown[]) => [] as unknown[]),
}));

vi.mock("@/lib/db", () => ({ sql: mockSql }));

// Helpers -------------------------------------------------------------

/** Extract the full SQL text from a tagged-template call to the stubbed sql. */
function sqlText(callIndex = 0): string {
  const call = mockSql.mock.calls[callIndex];
  const parts = call[0] as unknown as TemplateStringsArray;
  return Array.from(parts).join("");
}

/** Extract the parameterized values of a tagged-template call (neon parameterizes ${} interpolations). */
function sqlArgs(callIndex = 0): unknown[] {
  return mockSql.mock.calls[callIndex].slice(1);
}

// Tests -----------------------------------------------------------------

describe("mock payment", () => {
  beforeEach(() => mockSql.mockClear());

  it("createPayment succeeds and persists an INSERT into mock_payments", async () => {
    const { payment } = await import("@/lib/mock");
    const result = await payment.createPayment({ amount: 4999, currency: "usd" });
    expect(result).toMatchObject({ status: "succeeded", amount: 4999, currency: "usd" });
    expect(result.id).toBeTruthy();
    expect(mockSql).toHaveBeenCalledTimes(1);
    expect(sqlText()).toContain("INSERT INTO mock_payments");
    expect(sqlArgs()).toContain("succeeded");
    expect(sqlArgs()).toContain(4999);
  });

  it("createPayment with fail:true returns failed and persists the failure", async () => {
    const { payment } = await import("@/lib/mock");
    const result = await payment.createPayment({ amount: 100, currency: "usd", fail: true });
    expect(result).toMatchObject({ status: "failed", amount: 100, currency: "usd" });
    expect(mockSql).toHaveBeenCalledTimes(1);
    expect(sqlText()).toContain("INSERT INTO mock_payments");
    expect(sqlArgs()).toContain("failed");
  });
});

// Phase 2 client-branch tests (RESEARCH Pattern 3): the fake PoolClient is
// passed directly — no vi.mock change needed. The module `sql` must NOT be
// called when a client is present (the tagged template is HTTP-only and can
// never join a transaction — Pitfall 5).
describe("mock payment client branch", () => {
  beforeEach(() => mockSql.mockClear());

  it("createPayment with a client uses client.query (pg-style) and skips module sql", async () => {
    const { payment } = await import("@/lib/mock");
    const fakeClient = { query: vi.fn() };
    const result = await payment.createPayment(
      { amount: 750, currency: "usd" },
      fakeClient as unknown as import("@neondatabase/serverless").PoolClient,
    );
    expect(result).toMatchObject({ status: "succeeded", amount: 750, currency: "usd" });
    expect(fakeClient.query).toHaveBeenCalledTimes(1);
    const [sqlText, params] = fakeClient.query.mock.calls[0];
    expect(sqlText).toContain("INSERT INTO mock_payments");
    expect(params).toEqual([result.id, 750, "usd", "succeeded"]);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("refund with a client marks the payment refunded via client.query", async () => {
    const { payment } = await import("@/lib/mock");
    const fakeClient = { query: vi.fn() };
    const id = "e4111111-1111-4111-8111-111111111111";
    const result = await payment.refund(
      id,
      fakeClient as unknown as import("@neondatabase/serverless").PoolClient,
    );
    expect(result).toMatchObject({ id, status: "refunded" });
    expect(fakeClient.query).toHaveBeenCalledTimes(1);
    const [sqlText, params] = fakeClient.query.mock.calls[0];
    expect(sqlText).toContain("UPDATE mock_payments");
    expect(sqlText).toContain("'refunded'");
    expect(params).toEqual([id]);
    expect(mockSql).not.toHaveBeenCalled();
  });
});

describe("mock email", () => {
  beforeEach(() => mockSql.mockClear());

  it("sendEmail returns sent and persists into mock_emails", async () => {
    const { email } = await import("@/lib/mock");
    const result = await email.sendEmail({
      to: "a@example.com",
      subject: "Hello",
      text: "Body",
    });
    expect(result).toMatchObject({ status: "sent" });
    expect(result.id).toBeTruthy();
    expect(mockSql).toHaveBeenCalledTimes(1);
    expect(sqlText()).toContain("INSERT INTO mock_emails");
    expect(sqlArgs()).toContain("a@example.com");
  });
});

describe("mock sms", () => {
  beforeEach(() => mockSql.mockClear());

  it("sendSms returns delivered and persists into mock_sms", async () => {
    const { sms } = await import("@/lib/mock");
    const result = await sms.sendSms({ to: "+15551234567", message: "Hi!" });
    expect(result).toMatchObject({ status: "delivered" });
    expect(result.id).toBeTruthy();
    expect(mockSql).toHaveBeenCalledTimes(1);
    expect(sqlText()).toContain("INSERT INTO mock_sms");
    expect(sqlArgs()).toContain("+15551234567");
  });
});

describe("mock oauth", () => {
  it("getAuthUrl returns a URL string", async () => {
    const { oauth } = await import("@/lib/mock");
    const url = oauth.getAuthUrl();
    expect(typeof url).toBe("string");
    expect(url.startsWith("https://")).toBe(true);
  });

  it("exchangeCode('demo') auto-logs-in the demo user", async () => {
    const { oauth } = await import("@/lib/mock");
    const result = await oauth.exchangeCode("demo");
    expect(result.user).toMatchObject({
      email: "demo@example.com",
      name: expect.any(String),
    });
    expect(typeof result.accessToken).toBe("string");
  });
});

describe("mock maps", () => {
  it("geocode returns realistic coordinates (lng !== 0)", async () => {
    const { maps } = await import("@/lib/mock");
    const result = await maps.geocode("1 Main St");
    expect(typeof result.lat).toBe("number");
    expect(typeof result.lng).toBe("number");
    expect(result.lng).not.toBe(0);
    expect(result.formattedAddress.length).toBeGreaterThan(0);
  });

  it("getStaticMapUrl returns a URL with no real API key", async () => {
    const { maps } = await import("@/lib/mock");
    const url = maps.getStaticMapUrl({ lat: 37.42, lng: -122.08 });
    expect(url.startsWith("https://")).toBe(true);
    expect(url).not.toMatch(/[?&]key=(?!CHANGE)/);
  });
});

describe("mock storage", () => {
  beforeEach(() => mockSql.mockClear());

  it("upload persists metadata only (no blob) and returns url + size", async () => {
    const { storage } = await import("@/lib/mock");
    const result = await storage.upload({ name: "avatar.png", data: "fakeimagebytes" });
    expect(result.url).toBeTruthy();
    expect(result.size).toBe(14); // "fakeimagebytes".length
    expect(mockSql).toHaveBeenCalledTimes(1);
    const sql = sqlText();
    expect(sql).toContain("INSERT INTO mock_uploads");
    expect(sqlArgs()).toContain("avatar.png");
    expect(sqlArgs()).not.toContain("fakeimagebytes"); // blob never persisted
  });

  it("getUrl(id) returns the stored url", async () => {
    const { storage } = await import("@/lib/mock");
    mockSql.mockResolvedValueOnce([{ url: "https://mock.storage/abc/avatar.png" }]);
    const url = await storage.getUrl("abc");
    expect(url).toBe("https://mock.storage/abc/avatar.png");
  });
});

describe("mock index", () => {
  it("re-exports all six services for @/lib/mock imports", async () => {
    const index = await import("@/lib/mock");
    expect(typeof index.payment.createPayment).toBe("function");
    expect(typeof index.email.sendEmail).toBe("function");
    expect(typeof index.sms.sendSms).toBe("function");
    expect(typeof index.oauth.getAuthUrl).toBe("function");
    expect(typeof index.maps.geocode).toBe("function");
    expect(typeof index.storage.upload).toBe("function");
  });
});
