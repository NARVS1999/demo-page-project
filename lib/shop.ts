// lib/shop.ts — client-safe shop contracts and display helpers.
// This module intentionally has no server-only imports: catalog data and pure
// money/reference helpers are shared by server pages, client components, tests,
// and the seed's serializable fixture contracts.

export type ShopCategorySlug = "drinks" | "beans" | "bakery";

export type CatalogProduct = {
  id: string;
  slug: string;
  categorySlug: ShopCategorySlug;
  categoryName: string;
  name: string;
  description: string;
  imageUrl: string | null;
  priceCents: number;
  inventory: number;
};

export type CartItemRow = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  inventory: number;
  lineTotalCents: number;
};

export type OrderStatus = "paid" | "preparing" | "ready" | "cancelled";

export type OrderItemSnapshot = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type OrderSummary = {
  id: string;
  status: OrderStatus;
  totalCents: number;
  paymentStatus: string;
  createdAt: string;
  items: OrderItemSnapshot[];
};

/** Format integer cents for the Northstar display edge. */
export function formatShopPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

/** Display-only reference; the UUID remains the canonical order identifier. */
export function orderRef(id: string): string {
  return `#NS-${id.slice(0, 4).toUpperCase()}`;
}
