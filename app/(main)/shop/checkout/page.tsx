import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { type CartItemRow } from "@/lib/shop";
import { CheckoutForm } from "@/components/shop/checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/shop/checkout");

  const rows = await sql`
    SELECT ci.product_id, p.slug, p.name, p.image_url, ci.quantity,
           p.price_cents, p.inventory, (ci.quantity * p.price_cents) AS line_total_cents
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = ${user.id}
     ORDER BY ci.created_at ASC`;
  if (rows.length === 0) redirect("/shop/cart");

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
  const totalCents = items.reduce((total, item) => total + item.lineTotalCents, 0);

  // CheckoutForm renders the server-validated simulateFailure checkbox.
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="border-b-2 border-primary font-mono text-xs uppercase tracking-[0.28em] text-primary">Counter pickup</p>
        <div className="h-px w-full bg-muted-foreground/40" />
        <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">Checkout</h1>
        <p className="text-base text-muted-foreground">Your order will be ready at Northstar Coffee.</p>
      </div>
      <CheckoutForm user={{ name: user.name, email: user.email }} rows={items} totalCents={totalCents} />
    </div>
  );
}
