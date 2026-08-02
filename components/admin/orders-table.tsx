"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus } from "@/app/admin/orders/actions";
import { formatShopPrice, orderRef, type OrderStatus } from "@/lib/shop";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type OrderRow = {
  id: string;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  createdAt: string;
  paymentStatus: string;
};

const statusVariant = {
  paid: "default",
  preparing: "secondary",
  ready: "outline",
  cancelled: "outline",
} as const;

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function TransitionDialog({ row, target, label }: { row: OrderRow; target: "preparing" | "ready"; label: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateOrderStatus, null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!state?.ok) return;
    toast.success("Order updated.");
    router.refresh();
    const timer = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(timer);
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="secondary" size="sm">{label}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}?</DialogTitle>
          <DialogDescription>Update {orderRef(row.id)} to {target}.</DialogDescription>
        </DialogHeader>
        {state?.message && <p className="text-sm text-destructive" role="alert">{state.message}</p>}
        <form action={formAction}>
          <input type="hidden" name="orderId" value={row.id} />
          <input type="hidden" name="status" value={target} />
          <DialogFooter><Button type="submit" disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}{label}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelOrderDialog({ row }: { row: OrderRow }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateOrderStatus, null);
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (!state?.ok) return;
    toast.success("Order cancelled. Payment refunded.");
    router.refresh();
    const timer = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(timer);
  }, [state, router]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">Cancel order</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel order?</AlertDialogTitle>
          <AlertDialogDescription>The payment will be refunded and inventory restored.</AlertDialogDescription>
        </AlertDialogHeader>
        {state?.message && <p className="text-sm text-destructive" role="alert">{state.message}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Not yet</AlertDialogCancel>
          <form ref={formRef} action={formAction} aria-label="Cancel order">
            <input type="hidden" name="orderId" value={row.id} />
            <input type="hidden" name="status" value="cancelled" />
            <AlertDialogAction
              type="submit"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                formRef.current?.requestSubmit();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pending ? "Cancelling…" : "Cancel order"}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function OrderActions({ row }: { row: OrderRow }) {
  if (row.status === "paid") return <TransitionDialog row={row} target="preparing" label="Start preparing" />;
  if (row.status === "preparing") {
    return <><TransitionDialog row={row} target="ready" label="Mark ready" /><CancelOrderDialog row={row} /></>;
  }
  return null;
}

export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[720px] w-full">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Order</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Customer</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Total</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Placed</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b align-top last:border-b-0 hover:bg-muted/50">
              <td className="whitespace-nowrap px-4 py-4 font-mono text-sm">{orderRef(row.id)}</td>
              <td className="px-4 py-4"><span className="block max-w-[220px] truncate text-sm font-medium">{row.customerName}</span><span className="block max-w-[220px] truncate font-mono text-xs text-muted-foreground" title={row.customerEmail}>{row.customerEmail}</span></td>
              <td className="whitespace-nowrap px-4 py-4 font-mono text-sm">{formatShopPrice(row.totalCents)}</td>
              <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-muted-foreground">{dateFmt.format(new Date(row.createdAt))}</td>
              <td className="px-4 py-4"><Badge variant={statusVariant[row.status]} className={row.status === "cancelled" ? "text-muted-foreground" : undefined}>{row.status}</Badge></td>
              <td className="px-4 py-4"><div className="flex min-w-[180px] justify-end gap-2"><OrderActions row={row} /></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
