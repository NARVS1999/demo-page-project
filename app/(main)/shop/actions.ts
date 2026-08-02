// Northstar shop server actions. All cart/order writes stay behind the
// authenticated session and use the PoolClient transaction branch so payment,
// inventory, order snapshots, and cart deletion share one commit boundary.

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { flattenError } from "zod";
import { withPool } from "@/lib/db";
import { email, payment } from "@/lib/mock";
import { getCurrentUser } from "@/lib/session";
import { isUuid, safeNextUrl } from "@/lib/utils";
import { cartQuantitySchema, checkoutSchema } from "@/lib/validate";

export type FormState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  ok?: boolean;
  orderId?: string;
};

type CartProductRow = {
  product_id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
  quantity: number | string;
  price_cents: number | string;
  inventory: number | string;
};

class ShopStockConflictError extends Error {}

function stockMessage(inventory: number): string {
  return `Only ${inventory} left. Choose a smaller quantity.`;
}

function invalidProductState(): FormState {
  return { message: "This product is no longer available." };
}

function invalidQuantityState(errors: Record<string, string[] | undefined>): FormState {
  return { errors };
}

function stockState(inventory: number): FormState {
  const message = stockMessage(inventory);
  return { message, errors: { quantity: [message] } };
}

function parseCartInput(formData: FormData):
  | { ok: true; productId: string; quantity: number }
  | { ok: false; state: FormState } {
  const productId = formData.get("productId");
  if (typeof productId !== "string" || !isUuid(productId)) {
    return { ok: false, state: invalidProductState() };
  }

  const quantity = cartQuantitySchema.safeParse(formData.get("quantity"));
  if (!quantity.success) {
    return {
      ok: false,
      state: invalidQuantityState({
        quantity: [quantity.error.issues[0]?.message ?? "Enter a valid quantity."],
      }),
    };
  }

  return { ok: true, productId, quantity: quantity.data };
}

function loginTarget(formData: FormData, fallback: string): string {
  const requested = formData.get("next");
  return safeNextUrl(typeof requested === "string" ? requested : null, fallback);
}

async function getProductInventory(
  client: import("@neondatabase/serverless").PoolClient,
  userId: string,
  productId: string,
) {
  // Serialize all cart changes for a product before checking the user's
  // current cart quantity. The product lock also covers the missing-cart-row
  // case, where there is no row for PostgreSQL to lock yet.
  const productResult = await client.query(
    `SELECT inventory
       FROM products
      WHERE id = $1
      FOR UPDATE`,
    [productId],
  );
  if (productResult.rowCount === 0) return null;

  const cartResult = await client.query(
    `SELECT quantity AS cart_quantity
       FROM cart_items
      WHERE user_id = $1 AND product_id = $2
      FOR UPDATE`,
    [userId, productId],
  );
  return {
    inventory: Number(productResult.rows[0].inventory),
    cartQuantity: Number(cartResult.rows[0]?.cart_quantity ?? 0),
  };
}

export async function addToCart(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) {
    const next = encodeURIComponent(loginTarget(formData, "/shop"));
    redirect(`/login?next=${next}`);
  }

  const parsed = parseCartInput(formData);
  if (!parsed.ok) return parsed.state;

  const result = await withPool(async (client) => {
    const product = await getProductInventory(client, user.id, parsed.productId);
    if (!product) return { kind: "missing" as const };
    const available = product.inventory - product.cartQuantity;
    if (parsed.quantity > available) {
      return { kind: "stock" as const, inventory: Math.max(available, 0) };
    }

    await client.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id) DO UPDATE
         SET quantity = cart_items.quantity + EXCLUDED.quantity,
             updated_at = now()`,
      [user.id, parsed.productId, parsed.quantity],
    );
    return { kind: "success" as const };
  });

  if (result.kind === "missing") return invalidProductState();
  if (result.kind === "stock") return stockState(result.inventory);
  revalidatePath("/shop");
  revalidatePath("/shop/cart");
  revalidatePath("/shop/checkout");
  return { ok: true };
}

export async function updateCartQuantity(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/shop/cart");

  const parsed = parseCartInput(formData);
  if (!parsed.ok) return parsed.state;

  const result = await withPool(async (client) => {
    const product = await getProductInventory(client, user.id, parsed.productId);
    if (!product) return { kind: "missing" as const };
    if (parsed.quantity > product.inventory) {
      return { kind: "stock" as const, inventory: product.inventory };
    }

    const updated = await client.query(
      `UPDATE cart_items
          SET quantity = $1, updated_at = now()
        WHERE user_id = $2 AND product_id = $3`,
      [parsed.quantity, user.id, parsed.productId],
    );
    if (updated.rowCount === 0) return { kind: "missing" as const };
    return { kind: "success" as const };
  });

  if (result.kind === "missing") return invalidProductState();
  if (result.kind === "stock") return stockState(result.inventory);
  revalidatePath("/shop");
  revalidatePath("/shop/cart");
  revalidatePath("/shop/checkout");
  return { ok: true };
}

export async function removeFromCart(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/shop/cart");

  const productId = formData.get("productId");
  if (typeof productId !== "string" || !isUuid(productId)) {
    return invalidProductState();
  }

  await withPool((client) =>
    client.query(
      `DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2`,
      [user.id, productId],
    ).then(() => undefined),
  );
  revalidatePath("/shop");
  revalidatePath("/shop/cart");
  revalidatePath("/shop/checkout");
  return { ok: true };
}

/**
 * Consume the signed-in user's full cart using current locked product values.
 * The tracer starts with the successful payment path; the failure branch is
 * intentionally represented here so the later cart task can make it visible
 * without changing the transaction boundary.
 */
export async function checkout(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/shop/checkout");

  const parsed = checkoutSchema.safeParse({
    simulateFailure: formData.get("simulateFailure"),
  });
  if (!parsed.success) {
    return { errors: flattenError(parsed.error).fieldErrors };
  }

  try {
    const result = await withPool(async (client) => {
      const cartResult = await client.query(
        `SELECT ci.product_id, p.slug, p.name, p.description, p.image_url,
                ci.quantity, p.price_cents, p.inventory
           FROM cart_items ci
           JOIN products p ON p.id = ci.product_id
          WHERE ci.user_id = $1
          ORDER BY ci.created_at ASC
          FOR UPDATE OF ci, p`,
        [user.id],
      );
      const cart = cartResult.rows as CartProductRow[];
      if (cart.length === 0) return { kind: "empty" as const };

      const lines = cart.map((row) => ({
        ...row,
        quantity: Number(row.quantity),
        priceCents: Number(row.price_cents),
        inventory: Number(row.inventory),
      }));
      const overStock = lines.find((line) => line.quantity > line.inventory);
      if (overStock) {
        return {
          kind: "stock" as const,
          message: stockMessage(overStock.inventory),
        };
      }

      const totalCents = lines.reduce(
        (total, line) => total + line.quantity * line.priceCents,
        0,
      );
      const createdPayment = await payment.createPayment(
        {
          amount: totalCents,
          currency: "usd",
          fail: parsed.data.simulateFailure,
        },
        client,
      );

      if (createdPayment.status === "failed") {
        return { kind: "failed" as const };
      }

      for (const line of lines) {
        const updated = await client.query(
          `UPDATE products
              SET inventory = inventory - $1, updated_at = now()
            WHERE id = $2 AND inventory >= $1`,
          [line.quantity, line.product_id],
        );
        if (updated.rowCount === 0) throw new ShopStockConflictError();
      }

      const orderResult = await client.query(
        `INSERT INTO orders (user_id, payment_id, total_cents, status)
         VALUES ($1, $2, $3, 'paid')
         RETURNING id`,
        [user.id, createdPayment.id, totalCents],
      );
      const orderId = orderResult.rows[0].id as string;

      for (const line of lines) {
        await client.query(
          `INSERT INTO order_items
             (order_id, product_id, product_name, quantity, unit_price_cents, line_total_cents)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            orderId,
            line.product_id,
            line.name,
            line.quantity,
            line.priceCents,
            line.quantity * line.priceCents,
          ],
        );
      }

      await client.query(`DELETE FROM cart_items WHERE user_id = $1`, [user.id]);
      return { kind: "success" as const, orderId };
    });

    if (result.kind === "empty") return { message: "Your cart is empty." };
    if (result.kind === "stock") return { message: result.message };
    if (result.kind === "failed") {
      return { message: "Payment failed. No order was created. Your cart is unchanged. Try again." };
    }

    await email.sendEmail({
      to: user.email,
      subject: "Northstar Coffee receipt",
      text: `Your Northstar Coffee order ${result.orderId} is ready for counter pickup.`,
      orderId: result.orderId,
    });
    revalidatePath("/shop");
    revalidatePath("/shop/cart");
    revalidatePath("/shop/checkout");
    return { ok: true, orderId: result.orderId };
  } catch (error) {
    if (error instanceof ShopStockConflictError) {
      return { message: "Inventory changed. Review your cart and try again." };
    }
    throw error;
  }
}
