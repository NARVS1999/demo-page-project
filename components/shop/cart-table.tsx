"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { removeFromCart, updateCartQuantity, type FormState } from "@/app/(main)/shop/actions";
import { formatShopPrice, type CartItemRow } from "@/lib/shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CoverImage } from "@/components/blog/cover-image";

function CartRow({ row }: { row: CartItemRow }) {
  const router = useRouter();
  const [quantity, setQuantity] = React.useState(String(row.quantity));
  const updateActionHandler = async (prev: FormState | null, formData: FormData): Promise<FormState> => {
    const result = await updateCartQuantity(prev, formData);
    if (!result?.ok) setQuantity(String(row.quantity));
    return result ?? {};
  };
  const [updateState, updateAction, updatePending] = useActionState(updateActionHandler, null);
  const [removeState, removeAction, removePending] = useActionState(removeFromCart, null);
  const state = updateState ?? removeState;

  React.useEffect(() => {
    if (updateState?.ok) {
      toast.success("Cart updated.");
      router.refresh();
    }
  }, [updateState, router]);

  React.useEffect(() => {
    if (removeState?.ok) {
      toast.success("Item removed.");
      router.refresh();
    }
  }, [removeState, router]);

  const stockMessage = state?.message ?? state?.errors?.quantity?.[0];
  return (
    <tr className="border-b align-top last:border-b-0">
      <td className="px-4 py-4">
        <div className="flex min-w-[190px] items-center gap-3">
          {row.imageUrl ? (
            <CoverImage src={row.imageUrl} alt={`Photo of ${row.name}`} className="h-14 w-14 shrink-0 object-cover" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-muted text-muted-foreground" aria-hidden="true">
              <ShoppingBag className="h-5 w-5" />
            </div>
          )}
          <Link href={`/shop/${row.slug}`} className="text-sm font-medium hover:text-primary">
            {row.name}
          </Link>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-4 font-mono text-sm">
        {formatShopPrice(row.unitPriceCents)}
      </td>
      <td className="px-4 py-4">
        <form action={updateAction} className="flex min-w-[150px] flex-col gap-2">
          <input type="hidden" name="productId" value={row.productId} />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={`Decrease quantity for ${row.name}`}
              disabled={updatePending || removePending || Number(quantity) <= 1}
              onClick={() => setQuantity(String(Math.max(1, Number(quantity) - 1)))}
            >
              <Minus aria-hidden="true" />
            </Button>
            <Input
              aria-label={`Quantity for ${row.name}`}
              name="quantity"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              disabled={updatePending || removePending}
              aria-invalid={stockMessage ? true : undefined}
              aria-describedby={`cart-error-${row.productId}`}
              className="w-16 text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={`Increase quantity for ${row.name}`}
              disabled={updatePending || removePending || Number(quantity) >= row.inventory}
              onClick={() => setQuantity(String(Math.min(row.inventory, Number(quantity) + 1)))}
            >
              <Plus aria-hidden="true" />
            </Button>
          </div>
          <Button type="submit" variant="secondary" size="sm" disabled={updatePending || removePending}>
            {updatePending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {updatePending ? "Updating…" : `Update quantity for ${row.name}`}
          </Button>
          {stockMessage && (
            <p id={`cart-error-${row.productId}`} className="max-w-[180px] text-xs text-destructive" role="alert">
              {stockMessage}
            </p>
          )}
        </form>
      </td>
      <td className="whitespace-nowrap px-4 py-4 font-mono text-sm">
        {formatShopPrice(row.lineTotalCents)}
        <span className="mt-1 block font-sans text-xs text-muted-foreground">
          {row.inventory} in stock
        </span>
      </td>
      <td className="px-4 py-4 text-right">
        <form action={removeAction}>
          <input type="hidden" name="productId" value={row.productId} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={updatePending || removePending}
            aria-label={`Remove ${row.name}`}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {removePending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="mr-2 h-3.5 w-3.5" aria-hidden="true" />}
            {removePending ? "Removing…" : "Remove"}
          </Button>
        </form>
      </td>
    </tr>
  );
}

export function CartTable({ rows }: { rows: CartItemRow[] }) {
  return (
    <div className="overflow-x-auto border border-border">
      <table className="min-w-[760px] w-full">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Product</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Price</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Quantity</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Line total</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => <CartRow key={row.productId} row={row} />)}
        </tbody>
      </table>
    </div>
  );
}
