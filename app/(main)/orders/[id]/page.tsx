import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isUuid } from "@/lib/utils";
import { type OrderSummary } from "@/lib/shop";
import { OrderConfirmation } from "@/components/shop/order-confirmation";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  if (!isUuid(id)) notFound();
  const user = await getCurrentUser();
  if (!user) notFound();

  const orderRows = await sql`
    SELECT o.id, o.status, o.total_cents, o.created_at,
           mp.status AS payment_status
      FROM orders o
      LEFT JOIN mock_payments mp ON mp.id = o.payment_id
     WHERE o.id = ${id} AND o.user_id = ${user.id}`;
  if (orderRows.length === 0) notFound();

  const itemRows = await sql`
    SELECT oi.id, oi.product_id, oi.product_name, oi.quantity,
           oi.unit_price_cents, oi.line_total_cents
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
     WHERE oi.order_id = ${id} AND o.user_id = ${user.id}
     ORDER BY oi.created_at ASC`;
  const row = orderRows[0];
  const order: OrderSummary = {
    id: row.id as string,
    status: row.status as OrderSummary["status"],
    totalCents: Number(row.total_cents),
    paymentStatus: (row.payment_status as string) ?? "unknown",
    createdAt: new Date(row.created_at).toISOString(),
    items: itemRows.map((item) => ({
      id: item.id as string,
      productId: item.product_id as string,
      productName: item.product_name as string,
      quantity: Number(item.quantity),
      unitPriceCents: Number(item.unit_price_cents),
      lineTotalCents: Number(item.line_total_cents),
    })),
  };

  return <OrderConfirmation order={order} user={{ name: user.name, email: user.email }} />;
}
