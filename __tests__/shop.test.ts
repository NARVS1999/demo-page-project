import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockWithPool, mockGetCurrentUser, mockCreatePayment, mockSendEmail, mockRevalidatePath } =
  vi.hoisted(() => ({
    mockWithPool: vi.fn(),
    mockGetCurrentUser: vi.fn(),
    mockCreatePayment: vi.fn(),
    mockSendEmail: vi.fn(),
    mockRevalidatePath: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({ withPool: mockWithPool }));
vi.mock("@/lib/session", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/lib/mock", () => ({
  payment: { createPayment: mockCreatePayment },
  email: { sendEmail: mockSendEmail },
}));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const USER_ID = "1042abcd-1234-4111-8111-111111111111";
const PRODUCT_ID = "2042abcd-1234-4111-8111-111111111111";
const ORDER_ID = "3042abcd-1234-4111-8111-111111111111";

describe("shop helpers", () => {
  it("formats integer cents at the display edge", async () => {
    const { formatShopPrice } = await import("@/lib/shop");
    expect(formatShopPrice(650)).toBe("$6.50");
    expect(formatShopPrice(1200)).toBe("$12");
  });

  it("creates a stable display-only order reference", async () => {
    const { orderRef } = await import("@/lib/shop");
    expect(orderRef(ORDER_ID)).toBe("#NS-3042");
  });
});

describe("checkout", () => {
  beforeEach(() => {
    mockWithPool.mockReset();
    mockGetCurrentUser.mockReset();
    mockCreatePayment.mockReset();
    mockSendEmail.mockReset();
    mockRevalidatePath.mockReset();
  });

  it("creates a paid order from locked cart data and sends one post-commit receipt", async () => {
    const cartRows = [
      {
        product_id: PRODUCT_ID,
        slug: "house-filter",
        name: "House Filter",
        description: "A balanced daily cup.",
        image_url: null,
        quantity: 2,
        price_cents: 650,
        inventory: 8,
      },
    ];
    const client = {
      query: vi.fn(async (query: string) => {
        if (query.includes("FROM cart_items")) return { rows: cartRows, rowCount: 1 };
        if (query.includes("INSERT INTO orders")) return { rows: [{ id: ORDER_ID }], rowCount: 1 };
        return { rows: [], rowCount: 1 };
      }),
    };

    mockGetCurrentUser.mockResolvedValue({
      id: USER_ID,
      email: "demo@example.com",
      name: "Demo User",
    });
    mockWithPool.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) =>
      callback(client),
    );
    mockCreatePayment.mockResolvedValue({
      id: "4042abcd-1234-4111-8111-111111111111",
      status: "succeeded",
      amount: 1300,
      currency: "usd",
    });
    mockSendEmail.mockResolvedValue({ id: "email-1", status: "sent" });

    const { checkout } = await import("@/app/(main)/shop/actions");
    const result = await checkout(null, new FormData());

    expect(result).toEqual({ ok: true, orderId: ORDER_ID });
    expect(mockCreatePayment).toHaveBeenCalledWith(
      { amount: 1300, currency: "usd", fail: false },
      client,
    );
    expect(client.query.mock.calls.some(([query]) => query.includes("INSERT INTO order_items"))).toBe(true);
    expect(client.query.mock.calls.some(([query]) => query.includes("DELETE FROM cart_items"))).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: ORDER_ID, to: "demo@example.com" }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/shop");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/shop/cart");
  });
});
