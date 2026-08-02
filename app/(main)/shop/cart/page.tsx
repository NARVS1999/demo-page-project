import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatShopPrice, type CartItemRow } from "@/lib/shop";
import { CartTable } from "@/components/shop/cart-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/shop/cart");

  const rows = await sql`
    SELECT ci.product_id, p.slug, p.name, p.image_url, ci.quantity,
           p.price_cents, p.inventory, (ci.quantity * p.price_cents) AS line_total_cents
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = ${user.id}
     ORDER BY ci.created_at ASC`;

  const items: CartItemRow[] = rows.map((row) => ({
    productId: row.product_id as string,
    slug: row.slug as string,
    name: row.name as string,
    imageUrl: (row.image_url as string) ?? null,
    unitPriceCents: Number(row.price_cents),
    quantity: Number(row.quantity),
    inventory: Number(row.inventory),
    lineTotalCents: Number(row.line_total_cents),
  }));
  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="border-b-2 border-primary font-mono text-xs uppercase tracking-[0.28em] text-primary">Northstar Coffee</p>
        <div className="h-px w-full bg-muted-foreground/40" />
        <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">Your cart</h1>
        <p className="text-base text-muted-foreground">Review your items before pickup.</p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-5 w-5" aria-hidden="true" />}
          title="Your cart is empty"
          description="Add a drink, a bag of beans, or something warm from the bakery."
          action={<Button asChild><Link href="/shop">Browse the shop</Link></Button>}
        />
      ) : (
        <>
          <CartTable rows={items} />
          <div className="sticky bottom-0 -mx-4 flex flex-col gap-4 border-t border-border bg-background/95 p-4 backdrop-blur sm:-mx-6 sm:px-6 md:static md:mx-0 md:flex-row md:items-center md:justify-between md:bg-transparent md:p-0 md:backdrop-blur-none lg:-mx-0">
            <Button asChild variant="ghost"><Link href="/shop">Continue shopping</Link></Button>
            <div className="flex flex-wrap items-center justify-end gap-4">
              <p className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono text-base font-medium">{formatShopPrice(subtotalCents)}</span>
              </p>
              <Button asChild size="lg"><Link href="/shop/checkout">Continue to checkout</Link></Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
