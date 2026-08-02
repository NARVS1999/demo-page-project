import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const {
  mockWithPool,
  mockGetCurrentUser,
  mockCreatePayment,
  mockRefund,
  mockSendEmail,
  mockRevalidatePath,
  mockRedirect,
} = vi.hoisted(() => ({
    mockWithPool: vi.fn(),
    mockGetCurrentUser: vi.fn(),
    mockCreatePayment: vi.fn(),
    mockRefund: vi.fn(),
    mockSendEmail: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockRedirect: vi.fn((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    }),
  }));

vi.mock("@/lib/db", () => ({ withPool: mockWithPool }));
vi.mock("@/lib/session", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/lib/mock", () => ({
  payment: { createPayment: mockCreatePayment, refund: mockRefund },
  email: { sendEmail: mockSendEmail },
}));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

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
    mockRefund.mockReset();
    mockSendEmail.mockReset();
    mockRevalidatePath.mockReset();
    mockRedirect.mockReset();
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });
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

  it("redirects guests to the product return target and rejects malformed ids before SQL", async () => {
    const { addToCart } = await import("@/app/(main)/shop/actions");
    mockGetCurrentUser.mockResolvedValue(null);
    const guestData = new FormData();
    guestData.set("productId", PRODUCT_ID);
    guestData.set("quantity", "1");
    guestData.set("next", "/shop/house-filter");

    await expect(addToCart(null, guestData)).rejects.toThrow(
      "REDIRECT:/login?next=/shop/house-filter",
    );

    mockGetCurrentUser.mockResolvedValue({
      id: USER_ID,
      email: "demo@example.com",
      name: "Demo User",
    });
    const malformedData = new FormData();
    malformedData.set("productId", "not-a-uuid");
    malformedData.set("quantity", "1");
    expect(await addToCart(null, malformedData)).toEqual({
      message: "This product is no longer available.",
    });
    expect(mockWithPool).not.toHaveBeenCalled();
  });

  it("returns inline validation and stock errors without clamping cart quantities", async () => {
    const { addToCart, updateCartQuantity } = await import("@/app/(main)/shop/actions");
    mockGetCurrentUser.mockResolvedValue({
      id: USER_ID,
      email: "demo@example.com",
      name: "Demo User",
    });

    for (const quantity of ["0", "-1", "1.5", "nope"]) {
      const invalid = new FormData();
      invalid.set("productId", PRODUCT_ID);
      invalid.set("quantity", quantity);
      const result = await addToCart(null, invalid);
      expect(result.errors?.quantity?.[0]).toBeTruthy();
    }

    const client = {
      query: vi.fn(async (query: string) => {
        if (query.includes("SELECT inventory")) return { rows: [{ inventory: 3 }], rowCount: 1 };
        return { rows: [{ quantity: 1 }], rowCount: 1 };
      }),
    };
    mockWithPool.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) =>
      callback(client),
    );
    const tooMany = new FormData();
    tooMany.set("productId", PRODUCT_ID);
    tooMany.set("quantity", "4");
    const addResult = await addToCart(null, tooMany);
    expect(addResult).toEqual({
      message: "Only 3 left. Choose a smaller quantity.",
      errors: { quantity: ["Only 3 left. Choose a smaller quantity."] },
    });

    const updateTooMany = new FormData();
    updateTooMany.set("productId", PRODUCT_ID);
    updateTooMany.set("quantity", "4");
    const updateResult = await updateCartQuantity(null, updateTooMany);
    expect(updateResult).toEqual({
      message: "Only 3 left. Choose a smaller quantity.",
      errors: { quantity: ["Only 3 left. Choose a smaller quantity."] },
    });
    expect(client.query.mock.calls.some(([query]) => query.includes("INSERT INTO cart_items"))).toBe(false);
    expect(client.query.mock.calls.some(([query]) => query.includes("UPDATE cart_items"))).toBe(false);
  });

  it("commits a failed payment event while leaving inventory, orders, and cart rows untouched", async () => {
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
      status: "failed",
      amount: 1300,
      currency: "usd",
    });

    const { checkout } = await import("@/app/(main)/shop/actions");
    const formData = new FormData();
    formData.set("simulateFailure", "on");
    const result = await checkout(null, formData);

    expect(result).toEqual({
      message: "Payment failed. No order was created. Your cart is unchanged. Try again.",
    });
    expect(mockCreatePayment).toHaveBeenCalledWith(
      { amount: 1300, currency: "usd", fail: true },
      client,
    );
    expect(client.query.mock.calls.some(([query]) => query.includes("UPDATE products"))).toBe(false);
    expect(client.query.mock.calls.some(([query]) => query.includes("INSERT INTO orders"))).toBe(false);
    expect(client.query.mock.calls.some(([query]) => query.includes("INSERT INTO order_items"))).toBe(false);
    expect(client.query.mock.calls.some(([query]) => query.includes("DELETE FROM cart_items"))).toBe(false);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("preserves an empty or over-stock cart as a non-order result", async () => {
    const { checkout } = await import("@/app/(main)/shop/actions");
    mockGetCurrentUser.mockResolvedValue({
      id: USER_ID,
      email: "demo@example.com",
      name: "Demo User",
    });
    const client = {
      query: vi.fn(async (query: string) => {
        if (query.includes("FROM cart_items")) return { rows: [], rowCount: 0 };
        return { rows: [], rowCount: 0 };
      }),
    };
    mockWithPool.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) =>
      callback(client),
    );
    expect(await checkout(null, new FormData())).toEqual({ message: "Your cart is empty." });
    expect(mockCreatePayment).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("enforces legal order transitions and rejects stale or terminal actions generically", async () => {
    const { updateOrderStatus } = await import("@/app/admin/orders/actions");
    mockGetCurrentUser.mockResolvedValue({
      id: USER_ID,
      email: "demo@example.com",
      name: "Demo User",
    });
    const client = {
      query: vi.fn(async (query: string) => {
        if (query.includes("UPDATE orders")) {
          return { rows: [{ payment_id: "5042abcd-1234-4111-8111-111111111111" }], rowCount: 1 };
        }
        return { rows: [], rowCount: 1 };
      }),
    };
    mockWithPool.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) =>
      callback(client),
    );

    const preparing = new FormData();
    preparing.set("orderId", ORDER_ID);
    preparing.set("status", "preparing");
    expect(await updateOrderStatus(null, preparing)).toEqual({ ok: true });
    expect(client.query.mock.calls[0][1]).toEqual([ORDER_ID, "preparing"]);

    mockWithPool.mockImplementationOnce(async (callback: (client: unknown) => Promise<unknown>) =>
      callback({
        query: vi.fn(async (query: string) =>
          query.includes("UPDATE orders")
            ? { rows: [], rowCount: 0 }
            : { rows: [], rowCount: 1 },
        ),
      }),
    );
    const illegal = new FormData();
    illegal.set("orderId", ORDER_ID);
    illegal.set("status", "ready");
    expect(await updateOrderStatus(null, illegal)).toEqual({
      message: "This order is no longer available for that action.",
    });
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it("cancels a paid or preparing order with one refund and inventory restoration", async () => {
    const { updateOrderStatus } = await import("@/app/admin/orders/actions");
    mockGetCurrentUser.mockResolvedValue({
      id: USER_ID,
      email: "demo@example.com",
      name: "Demo User",
    });
    const paymentId = "5042abcd-1234-4111-8111-111111111111";
    const client = {
      query: vi.fn(async (query: string) => {
        if (query.includes("UPDATE orders")) return { rows: [{ payment_id: paymentId }], rowCount: 1 };
        if (query.includes("FROM order_items")) {
          return { rows: [{ product_id: PRODUCT_ID, quantity: 2 }], rowCount: 1 };
        }
        return { rows: [], rowCount: 1 };
      }),
    };
    mockWithPool.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) =>
      callback(client),
    );
    mockRefund.mockResolvedValue({ id: paymentId, status: "refunded" });

    const cancel = new FormData();
    cancel.set("orderId", ORDER_ID);
    cancel.set("status", "cancelled");
    expect(await updateOrderStatus(null, cancel)).toEqual({ ok: true });
    expect(mockRefund).toHaveBeenCalledWith(paymentId, client);
    expect(client.query.mock.calls.some(([query]) => query.includes("UPDATE products"))).toBe(true);
  });

  it("keeps the Northstar seed fixtures and size-report tables explicit", () => {
    const source = readFileSync("scripts/seed.ts", "utf8");
    const productsStart = source.indexOf("const NORTHSTAR_PRODUCTS = [");
    const productsEnd = source.indexOf("const NORTHSTAR_ORDERS = [");
    const products = source.slice(productsStart, productsEnd);
    expect(source).toContain("const NORTHSTAR_CATEGORIES = [");
    expect(products.match(/slug:/g)).toHaveLength(12);
    expect(products).toContain('categorySlug: "drinks"');
    expect(products).toContain('categorySlug: "beans"');
    expect(products).toContain('categorySlug: "bakery"');
    expect(source).toContain("const NORTHSTAR_ORDERS = [");
    expect(source).toContain("order_id");
    for (const table of ["shop_categories", "products", "cart_items", "orders", "order_items"]) {
      expect(source).toContain(`"${table}"`);
    }
  });
});
