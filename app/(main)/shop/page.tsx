import Link from "next/link";
import { Coffee } from "lucide-react";
import { sql } from "@/lib/db";
import { ProductCard } from "@/components/shop/product-card";
import { ProductFilters } from "@/components/shop/product-filters";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const CATEGORY_VALUES = new Set(["all", "drinks", "beans", "bakery"]);
const PRICE_VALUES = new Set(["all", "under-5", "5-15", "over-15"]);

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; price?: string }>;
}) {
  const params = await searchParams;
  const category = params.category && CATEGORY_VALUES.has(params.category) ? params.category : "all";
  const price = params.price && PRICE_VALUES.has(params.price) ? params.price : "all";
  const categoryClause = category === "all" ? sql`` : sql`AND sc.slug = ${category}`;
  const priceClause =
    price === "under-5"
      ? sql`AND p.price_cents < 500`
      : price === "5-15"
        ? sql`AND p.price_cents >= 500 AND p.price_cents <= 1500`
        : price === "over-15"
          ? sql`AND p.price_cents > 1500`
          : sql``;

  const rows = await sql`
    SELECT p.id, p.slug, p.name, p.description, p.image_url, p.price_cents,
           p.inventory, sc.slug AS category_slug, sc.name AS category_name
      FROM products p
      JOIN shop_categories sc ON sc.id = p.category_id
     WHERE 1 = 1 ${categoryClause} ${priceClause}
     ORDER BY sc.name ASC, p.name ASC`;

  const products = rows.map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    categorySlug: row.category_slug as "drinks" | "beans" | "bakery",
    categoryName: row.category_name as string,
    name: row.name as string,
    description: row.description as string,
    imageUrl: (row.image_url as string) ?? null,
    priceCents: Number(row.price_cents),
    inventory: Number(row.inventory),
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="border-b-2 border-primary font-mono text-xs uppercase tracking-[0.28em] text-primary">
          Northstar Coffee
        </p>
        <div className="h-px w-full bg-muted-foreground/40" />
        <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">Coffee for the next good thing</h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Small-batch drinks, beans, and bakes for the daily ritual.
        </p>
      </div>

      <ProductFilters current={{ category, price }} />

      {products.length === 0 ? (
        <EmptyState
          icon={<Coffee className="h-5 w-5" aria-hidden="true" />}
          title="No products yet"
          description="Northstar Coffee has not added any products."
          action={
            category !== "all" || price !== "all" ? (
              <Link href="/shop" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                Clear filters
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
