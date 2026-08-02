import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { ProductDetail } from "@/components/shop/product-detail";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rows = await sql`
    SELECT p.id, p.slug, p.name, p.description, p.image_url, p.price_cents,
           p.inventory, sc.slug AS category_slug, sc.name AS category_name
      FROM products p
      JOIN shop_categories sc ON sc.id = p.category_id
     WHERE p.slug = ${slug}`;

  if (rows.length === 0) notFound();
  const row = rows[0];
  return (
    <ProductDetail
      product={{
        id: row.id as string,
        slug: row.slug as string,
        categorySlug: row.category_slug as "drinks" | "beans" | "bakery",
        categoryName: row.category_name as string,
        name: row.name as string,
        description: row.description as string,
        imageUrl: (row.image_url as string) ?? null,
        priceCents: Number(row.price_cents),
        inventory: Number(row.inventory),
      }}
    />
  );
}
