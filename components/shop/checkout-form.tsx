"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { checkout, type FormState } from "@/app/(main)/shop/actions";
import { formatShopPrice, type CartItemRow } from "@/lib/shop";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function CheckoutForm({
  user,
  rows,
  totalCents,
  initialState = null,
}: {
  user: { name: string; email: string };
  rows: CartItemRow[];
  totalCents: number;
  initialState?: FormState | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(checkout, initialState);

  React.useEffect(() => {
    if (!state?.ok || !state.orderId) return;
    toast.success("Order placed.");
    router.push(`/orders/${state.orderId}`);
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <fieldset disabled={pending} className="flex flex-col gap-6 disabled:opacity-70">
        <section className="flex flex-col gap-3 border border-border p-4" aria-labelledby="customer-heading">
          <h2 id="customer-heading" className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Customer
          </h2>
          <p className="font-medium">{user.name}</p>
          <p className="font-mono text-sm text-muted-foreground">{user.email}</p>
        </section>

        <section className="flex flex-col gap-3 border border-border p-4" aria-labelledby="pickup-heading">
          <h2 id="pickup-heading" className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Counter pickup
          </h2>
          <p className="text-sm text-muted-foreground">
            Your order will be ready at Northstar Coffee. No shipping or delivery is needed.
          </p>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="review-heading">
          <h2 id="review-heading" className="font-serif text-2xl font-bold tracking-tight">Review your order</h2>
          <div className="divide-y divide-border border border-border">
            {rows.map((row) => (
              <div key={row.productId} className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {row.quantity} × {formatShopPrice(row.unitPriceCents)}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm">{formatShopPrice(row.lineTotalCents)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="font-medium">Total</span>
            <span className="font-mono text-lg">{formatShopPrice(totalCents)}</span>
          </div>
        </section>

        <div className="flex items-start gap-3 border-t border-border pt-5">
          <Checkbox id="simulateFailure" name="simulateFailure" />
          <Label htmlFor="simulateFailure" className="text-sm leading-6">
            Simulate payment failure
          </Label>
        </div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {pending ? "Placing order…" : "Place order"}
        </Button>
      </fieldset>
    </form>
  );
}
