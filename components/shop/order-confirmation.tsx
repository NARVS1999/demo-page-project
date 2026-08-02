import Link from "next/link";
import { Check, Coffee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatShopPrice, orderRef, type OrderStatus, type OrderSummary } from "@/lib/shop";

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

const ORDER_COPY: Record<OrderStatus, { eyebrow: string; title: string; description: string }> = {
  paid: {
    eyebrow: "Order received",
    title: "Thanks — we received your order",
    description: "Your payment was received. We will prepare your counter-pickup order next.",
  },
  preparing: {
    eyebrow: "Order in preparation",
    title: "We’re preparing your order",
    description: "Your counter-pickup order is being prepared.",
  },
  ready: {
    eyebrow: "Ready for pickup",
    title: "Your order is ready",
    description: "Your counter-pickup order is ready to collect.",
  },
  cancelled: {
    eyebrow: "Order cancelled",
    title: "Your order was cancelled",
    description: "Your order was cancelled. Review the payment status below for refund details.",
  },
};

function paymentLabel(status: string): string {
  if (status === "succeeded") return "Paid";
  if (status === "refunded") return "Refunded";
  if (status === "failed") return "Failed";
  return status;
}

export function OrderConfirmation({
  order,
  user,
}: {
  order: OrderSummary;
  user: { name: string; email: string };
}) {
  const copy = ORDER_COPY[order.status];
  const description =
    order.status === "cancelled" && order.paymentStatus === "refunded"
      ? "Your order was cancelled and your payment was refunded."
      : copy.description;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="border-b-2 border-primary font-mono text-xs uppercase tracking-[0.28em] text-primary">
          {copy.eyebrow} <span className="normal-case tracking-normal text-muted-foreground">{orderRef(order.id)}</span>
        </p>
        <div className="h-px w-full bg-muted-foreground/40" />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">{copy.title}</h1>
          <Badge variant={order.status === "ready" ? "outline" : "secondary"}>{order.status}</Badge>
        </div>
        <p className="text-base text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_0.8fr]">
        <section className="flex flex-col gap-4" aria-labelledby="order-items-heading">
          <h2 id="order-items-heading" className="font-serif text-2xl font-bold tracking-tight">Order items</h2>
          <div className="divide-y divide-border border border-border">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 text-primary"><Check className="h-4 w-4" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.productName}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {item.quantity} × {formatShopPrice(item.unitPriceCents)}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 font-mono text-sm">{formatShopPrice(item.lineTotalCents)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="font-medium">Total</span>
            <span className="font-mono text-lg">{formatShopPrice(order.totalCents)}</span>
          </div>
        </section>

        <aside className="flex flex-col gap-5 border border-border p-5">
          <div className="flex items-center gap-3">
            <Coffee className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-serif text-2xl font-bold tracking-tight">Pickup details</h2>
          </div>
          <dl className="divide-y divide-border border-y border-border">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-muted-foreground">Customer</dt>
              <dd className="text-right text-sm">{user.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-muted-foreground">Pickup</dt>
              <dd className="text-right text-sm">Counter pickup</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="max-w-[12rem] truncate font-mono text-xs" title={user.email}>{user.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-muted-foreground">Payment</dt>
              <dd className="text-right text-sm">{paymentLabel(order.paymentStatus)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-muted-foreground">Placed</dt>
              <dd className="font-mono text-xs">{dateFmt.format(new Date(order.createdAt))}</dd>
            </div>
          </dl>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Simulated receipt — no real email was sent.
          </p>
          <Button asChild variant="secondary">
            <Link href="/shop">Continue shopping</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
