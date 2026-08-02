import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isUuid } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderFilters } from "@/components/admin/order-filters";
import { OrdersTable, type OrderRow } from "@/components/admin/orders-table";

export const dynamic = "force-dynamic";

const STATUS_VALUES = new Set(["all", "paid", "preparing", "ready", "cancelled"]);

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; order?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/orders");
  const params = await searchParams;
  const status = params.status && STATUS_VALUES.has(params.status) ? params.status : "all";
  const orderId = params.order && isUuid(params.order) ? params.order : null;
  const statusClause = status === "all" ? sql`` : sql`AND o.status = ${status}`;
  const orderClause = orderId ? sql`AND o.id = ${orderId}` : sql``;
  const [rows, countRows] = await Promise.all([
    sql`
      SELECT o.id, o.status, o.total_cents, o.created_at,
             u.name AS customer_name, u.email AS customer_email,
             mp.status AS payment_status
        FROM orders o
        JOIN users u ON u.id = o.user_id
        LEFT JOIN mock_payments mp ON mp.id = o.payment_id
       WHERE 1 = 1 ${statusClause} ${orderClause}
       ORDER BY o.created_at DESC`,
    sql`
      SELECT count(*)::int AS count
        FROM orders o
       WHERE 1 = 1 ${statusClause} ${orderClause}`,
  ]);
  const orders: OrderRow[] = rows.map((row) => ({
    id: row.id as string,
    status: row.status as OrderRow["status"],
    customerName: row.customer_name as string,
    customerEmail: row.customer_email as string,
    totalCents: Number(row.total_cents),
    createdAt: new Date(row.created_at).toISOString(),
    paymentStatus: (row.payment_status as string) ?? "unknown",
  }));
  const count = Number(countRows[0]?.count ?? 0);
  const filtersActive = status !== "all" || orderId !== null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Orders" description={`Northstar Coffee · newest first · ${count} ${count === 1 ? "order" : "orders"}.`} />
      <div className="border border-border">
        <OrderFilters current={status} />
        {orders.length === 0 ? (
          filtersActive ? (
            <EmptyState title="No orders match these filters." description="Adjust the filters, or clear them." icon={<ShoppingBag className="h-5 w-5" aria-hidden="true" />} />
          ) : (
            <EmptyState title="No orders yet" description="Orders will appear here after customers check out." icon={<ShoppingBag className="h-5 w-5" aria-hidden="true" />} />
          )
        ) : <OrdersTable rows={orders} />}
      </div>
    </div>
  );
}
