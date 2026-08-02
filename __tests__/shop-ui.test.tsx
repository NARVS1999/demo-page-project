import { existsSync, readFileSync } from "node:fs";
import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SITE } from "@/lib/site";
import type { CatalogProduct } from "@/lib/shop";
import { ProductCard } from "@/components/shop/product-card";
import { ProductDetail } from "@/components/shop/product-detail";
import { ProductFilters } from "@/components/shop/product-filters";

const { mockAddToCart, mockUpdateCartQuantity, mockRemoveFromCart, mockCheckout } = vi.hoisted(() => ({
  mockAddToCart: vi.fn(),
  mockUpdateCartQuantity: vi.fn(),
  mockRemoveFromCart: vi.fn(),
  mockCheckout: vi.fn(),
}));
const { mockUpdateOrderStatus } = vi.hoisted(() => ({ mockUpdateOrderStatus: vi.fn() }));

vi.mock("@/app/(main)/shop/actions", () => ({
  addToCart: mockAddToCart,
  updateCartQuantity: mockUpdateCartQuantity,
  removeFromCart: mockRemoveFromCart,
  checkout: mockCheckout,
}));
vi.mock("@/app/admin/orders/actions", () => ({
  updateOrderStatus: mockUpdateOrderStatus,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} type="checkbox" />
  ),
}));

afterEach(() => cleanup());

const product: CatalogProduct = {
  id: "2042abcd-1234-4111-8111-111111111111",
  slug: "house-filter",
  categorySlug: "drinks",
  categoryName: "Drinks",
  name: "House Filter",
  description: "A balanced daily cup with cocoa and toasted almond.",
  imageUrl: null,
  priceCents: 650,
  inventory: 4,
};

const cartRow = {
  productId: product.id,
  slug: product.slug,
  name: product.name,
  imageUrl: null,
  unitPriceCents: 650,
  quantity: 2,
  inventory: 4,
  lineTotalCents: 1300,
};

describe("Northstar catalog components", () => {
  it("links product cards to slug detail pages and formats server cents", () => {
    render(<ProductCard product={product} />);

    expect(screen.getByRole("link", { name: "View product" }).getAttribute("href")).toBe(
      "/shop/house-filter",
    );
    expect(screen.getByText("$6.50")).toBeTruthy();
    expect(screen.getByText("Only 4 left")).toBeTruthy();
  });

  it("renders a detail form with the exact product id and no browser price field", () => {
    render(<ProductDetail product={product} />);

    expect(screen.getByRole("heading", { name: "House Filter" })).toBeTruthy();
    expect((screen.getByLabelText("Quantity") as HTMLInputElement).value).toBe("1");
    expect((screen.getByRole("button", { name: "Add to cart" }) as HTMLButtonElement).disabled).toBe(false);
    expect((document.querySelector('input[name="productId"]') as HTMLInputElement).value).toBe(product.id);
    expect(document.querySelector('input[name="price"]')).toBeNull();
  });

  it("makes sold-out products visibly unavailable", () => {
    render(<ProductDetail product={{ ...product, inventory: 0 }} />);

    expect(screen.getByText("Sold out")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Add to cart" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps category and price filters as shareable GET controls", () => {
    render(<ProductFilters current={{ category: "drinks", price: "under-5" }} />);

    const form = screen.getByRole("form", { name: "Shop filters" });
    expect(form.getAttribute("method")).toBe("GET");
    expect(form.getAttribute("action")).toBe("/shop");
    expect((screen.getByLabelText("Category") as HTMLSelectElement).value).toBe("drinks");
    expect((screen.getByLabelText("Price") as HTMLSelectElement).value).toBe("under-5");
    const submit = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => undefined);
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "beans" } });
    expect(submit).toHaveBeenCalledTimes(1);
    submit.mockRestore();
  });
});

describe("shop routes and navigation contract", () => {
  it("exposes Shop and Cart in the shared navigation", () => {
    expect(SITE.defaultNav).toEqual(
      expect.arrayContaining([
        { label: "Shop", href: "/shop" },
        { label: "Cart", href: "/shop/cart" },
      ]),
    );
  });

  it("ships catalog/detail route boundaries and force-dynamic declarations", () => {
    const routes = [
      "app/(main)/shop/loading.tsx",
      "app/(main)/shop/error.tsx",
      "app/(main)/shop/[slug]/loading.tsx",
      "app/(main)/shop/[slug]/error.tsx",
      "app/(main)/shop/[slug]/not-found.tsx",
    ];
    for (const route of routes) expect(existsSync(route)).toBe(true);
    expect(readFileSync("app/(main)/shop/page.tsx", "utf8")).toContain(
      'export const dynamic = "force-dynamic"',
    );
    expect(readFileSync("app/(main)/shop/[slug]/page.tsx", "utf8")).toContain(
      'export const dynamic = "force-dynamic"',
    );
  });
});

describe("cart, checkout, and order confirmation components", () => {
  it("renders a persistent cart row with bound quantity and remove controls", async () => {
    const { CartTable } = await import("@/components/shop/cart-table");
    render(<CartTable rows={[cartRow]} />);

    expect(screen.getByText("House Filter")).toBeTruthy();
    expect((screen.getByLabelText("Quantity for House Filter") as HTMLInputElement).value).toBe("2");
    expect(screen.getByRole("button", { name: "Update quantity for House Filter" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove House Filter" })).toBeTruthy();
    expect(screen.getByText("$13")).toBeTruthy();
  });

  it("keeps payment failure visible and retryable on the counter-pickup checkout form", async () => {
    const { CheckoutForm } = await import("@/components/shop/checkout-form");
    render(
      <CheckoutForm
        user={{ name: "Demo User", email: "demo@example.com" }}
        rows={[cartRow]}
        totalCents={1300}
        initialState={{
          message: "Payment failed. No order was created. Your cart is unchanged. Try again.",
        }}
      />,
    );

    expect(screen.getByText("Demo User")).toBeTruthy();
    expect(screen.getByText("Counter pickup")).toBeTruthy();
    expect(screen.getByLabelText("Simulate payment failure")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Your cart is unchanged");
    expect(screen.getByRole("button", { name: "Place order" })).toBeTruthy();
  });

  it("renders owner confirmation snapshots and simulated receipt honesty", async () => {
    const { OrderConfirmation } = await import("@/components/shop/order-confirmation");
    render(
      <OrderConfirmation
        order={{
          id: "3042abcd-1234-4111-8111-111111111111",
          status: "paid",
          totalCents: 1300,
          paymentStatus: "succeeded",
          createdAt: "2026-08-02T12:00:00.000Z",
          items: [
            {
              id: "6042abcd-1234-4111-8111-111111111111",
              productId: product.id,
              productName: product.name,
              quantity: 2,
              unitPriceCents: 650,
              lineTotalCents: 1300,
            },
          ],
        }}
        user={{ name: "Demo User", email: "demo@example.com" }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Thanks — we received your order" })).toBeTruthy();
    expect(screen.getByText("Your payment was received. We will prepare your counter-pickup order next.")).toBeTruthy();
    expect(screen.getByText("House Filter")).toBeTruthy();
    expect(screen.getByText("Simulated receipt — no real email was sent.")).toBeTruthy();
    expect(screen.getByText("Counter pickup")).toBeTruthy();
    expect(screen.getByText("Paid")).toBeTruthy();
  });

  it("shows cancellation and refund state on the owner confirmation", async () => {
    const { OrderConfirmation } = await import("@/components/shop/order-confirmation");
    render(
      <OrderConfirmation
        order={{
          id: "3042abcd-1234-4111-8111-111111111111",
          status: "cancelled",
          totalCents: 1300,
          paymentStatus: "refunded",
          createdAt: "2026-08-02T12:00:00.000Z",
          items: [],
        }}
        user={{ name: "Demo User", email: "demo@example.com" }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Your order was cancelled" })).toBeTruthy();
    expect(screen.getByText("Your order was cancelled and your payment was refunded.")).toBeTruthy();
    expect(screen.getByText("Refunded")).toBeTruthy();
  });

  it("protects cart, checkout, and order reads with route-level auth/ownership contracts", () => {
    const routeFiles = [
      "app/(main)/shop/cart/page.tsx",
      "app/(main)/shop/cart/loading.tsx",
      "app/(main)/shop/cart/error.tsx",
      "app/(main)/shop/checkout/page.tsx",
      "app/(main)/shop/checkout/loading.tsx",
      "app/(main)/shop/checkout/error.tsx",
      "app/(main)/orders/[id]/page.tsx",
      "app/(main)/orders/[id]/loading.tsx",
      "app/(main)/orders/[id]/error.tsx",
      "app/(main)/orders/[id]/not-found.tsx",
    ];
    for (const route of routeFiles) expect(existsSync(route)).toBe(true);
    const cartPage = readFileSync("app/(main)/shop/cart/page.tsx", "utf8");
    const checkoutPage = readFileSync("app/(main)/shop/checkout/page.tsx", "utf8");
    const orderPage = readFileSync("app/(main)/orders/[id]/page.tsx", "utf8");
    expect(cartPage).toContain('export const dynamic = "force-dynamic"');
    expect(cartPage).toContain("/login?next=/shop/cart");
    expect(checkoutPage).toContain("simulateFailure");
    expect(checkoutPage).toContain("/shop/cart");
    expect(orderPage).toContain('export const dynamic = "force-dynamic"');
    expect(orderPage).toContain("user_id");
  });
});

describe("admin order queue and receipt visibility", () => {
  it("renders shareable status filters and only legal row actions", async () => {
    const { OrderFilters } = await import("@/components/admin/order-filters");
    const { OrdersTable } = await import("@/components/admin/orders-table");
    const rows = [
      {
        id: "71111111-1111-4111-8111-111111111111",
        status: "paid" as const,
        customerName: "Demo User",
        customerEmail: "demo@example.com",
        totalCents: 1125,
        createdAt: "2026-08-01T12:00:00.000Z",
        paymentStatus: "succeeded",
      },
      {
        id: "72222222-2222-4222-8222-222222222222",
        status: "preparing" as const,
        customerName: "Demo User",
        customerEmail: "demo@example.com",
        totalCents: 2550,
        createdAt: "2026-08-01T11:00:00.000Z",
        paymentStatus: "succeeded",
      },
      {
        id: "73333333-3333-4333-8333-333333333333",
        status: "ready" as const,
        customerName: "Demo User",
        customerEmail: "demo@example.com",
        totalCents: 600,
        createdAt: "2026-08-01T10:00:00.000Z",
        paymentStatus: "succeeded",
      },
      {
        id: "74444444-4444-4444-8444-444444444444",
        status: "cancelled" as const,
        customerName: "Demo User",
        customerEmail: "demo@example.com",
        totalCents: 600,
        createdAt: "2026-08-01T09:00:00.000Z",
        paymentStatus: "refunded",
      },
    ];
    render(
      <>
        <OrderFilters current="preparing" />
        <OrdersTable rows={rows} />
      </>,
    );

    const filterForm = screen.getByRole("form", { name: "Order filters" });
    expect(filterForm.getAttribute("method")).toBe("GET");
    expect((screen.getByLabelText("Status") as HTMLSelectElement).value).toBe("preparing");
    expect(screen.getByRole("link", { name: "Clear filters" }).getAttribute("href")).toBe("/admin/orders");
    expect(screen.getByRole("button", { name: "Start preparing" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mark ready" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Cancel order" })).toHaveLength(2);
  });

  it("keeps admin order and email routes linked to the existing outbox", () => {
    const ordersPage = readFileSync("app/admin/orders/page.tsx", "utf8");
    const emailsPage = readFileSync("app/admin/emails/page.tsx", "utf8");
    const adminShell = readFileSync("components/layout/admin-shell.tsx", "utf8");
    expect(existsSync("app/admin/orders/loading.tsx")).toBe(true);
    expect(existsSync("app/admin/orders/error.tsx")).toBe(true);
    expect(ordersPage).toContain('export const dynamic = "force-dynamic"');
    expect(ordersPage).toContain("created_at DESC");
    expect(ordersPage).toContain("order");
    expect(ordersPage).toContain("status");
    expect(adminShell).toContain('group: "Shop"');
    expect(adminShell).toContain('href: "/admin/orders"');
    expect(emailsPage).toContain("order_id");
    expect(emailsPage).toContain("orderRef");
    expect(emailsPage).toContain("/admin/orders?order=");
  });
});
