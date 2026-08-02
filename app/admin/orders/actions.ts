// Admin order lifecycle actions. The existing admin layout/session boundary
// protects the route; this action still re-checks authentication and keeps
// every transition, refund, and restock inside a single PoolClient transaction.

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withPool } from "@/lib/db";
import { payment } from "@/lib/mock";
import { getCurrentUser } from "@/lib/session";
import { isUuid } from "@/lib/utils";
import { orderStatusSchema } from "@/lib/validate";

type OrderActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

const STALE_ORDER_MESSAGE = "This order is no longer available for that action.";

export async function updateOrderStatus(
  _prev: OrderActionState | null,
  formData: FormData,
): Promise<OrderActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/orders");

  const orderId = formData.get("orderId");
  const status = orderStatusSchema.safeParse(formData.get("status"));
  if (typeof orderId !== "string" || !isUuid(orderId) || !status.success) {
    return { message: STALE_ORDER_MESSAGE };
  }

  if (status.data === "paid") return { message: STALE_ORDER_MESSAGE };

  const outcome = await withPool(async (client) => {
    if (status.data === "cancelled") {
      const cancelled = await client.query(
        `UPDATE orders
            SET status = 'cancelled', updated_at = now()
          WHERE id = $1 AND status IN ('paid', 'preparing')
          RETURNING payment_id`,
        [orderId],
      );
      if (cancelled.rowCount === 0) return { ok: false as const };

      const items = await client.query(
        `SELECT product_id, quantity
           FROM order_items
          WHERE order_id = $1`,
        [orderId],
      );
      for (const item of items.rows as { product_id: string; quantity: number | string }[]) {
        await client.query(
          `UPDATE products
              SET inventory = inventory + $1, updated_at = now()
            WHERE id = $2`,
          [Number(item.quantity), item.product_id],
        );
      }

      await payment.refund(cancelled.rows[0].payment_id as string, client);
      return { ok: true as const };
    }

    const transitioned = await client.query(
      `UPDATE orders
          SET status = $2, updated_at = now()
        WHERE id = $1
          AND ((status = 'paid' AND $2 = 'preparing')
            OR (status = 'preparing' AND $2 = 'ready'))
        RETURNING id`,
      [orderId, status.data],
    );
    return { ok: (transitioned.rowCount ?? 0) > 0 };
  });

  if (!outcome.ok) return { message: STALE_ORDER_MESSAGE };
  revalidatePath("/admin/orders");
  revalidatePath("/shop");
  revalidatePath("/shop/cart");
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}
