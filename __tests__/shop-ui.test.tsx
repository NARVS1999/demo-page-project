import { existsSync, readFileSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SITE } from "@/lib/site";
import type { CatalogProduct } from "@/lib/shop";
import { ProductCard } from "@/components/shop/product-card";
import { ProductDetail } from "@/components/shop/product-detail";
import { ProductFilters } from "@/components/shop/product-filters";

vi.mock("@/app/(main)/shop/actions", () => ({
  addToCart: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

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

    const form = screen.getByRole("form");
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe("/shop");
    expect((screen.getByLabelText("Category") as HTMLSelectElement).value).toBe("drinks");
    expect((screen.getByLabelText("Price") as HTMLSelectElement).value).toBe("under-5");
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "beans" } });
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
