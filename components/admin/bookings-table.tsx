"use client";

// Admin bookings table (client, UI-SPEC Page 4 + Interaction 7/8 + a11y 7/8):
// Service (name + mono price suffix) / Customer (name + email, truncated with
// title) / Date & time (mono, whitespace-nowrap) / Status badge (confirmed=
// default, pending=secondary, cancelled=outline+muted) / Actions. "Confirm
// booking" (secondary) only on pending rows → non-destructive dialog bound to
// confirmBooking via per-row useActionState; "Cancel booking" (ghost
// destructive) on pending/confirmed rows → alert-dialog bound to
// cancelBookingAdmin with the requestSubmit intercept (Radix AlertDialogAction
// auto-closes before implicit form submission — same fix as
// cms-category-table.tsx lines 46-108). {ok} → toast (+ deposit-refund suffix
// when a payment exists) → router.refresh(). Skeleton variant + EmptyState
// handled by the page (table receives rows only when non-empty).

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatSlotDate, formatSlotTime, formatUsd } from "@/lib/booking";
import { confirmBooking, cancelBookingAdmin } from "@/app/admin/bookings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export type BookingRow = {
  id: string;
  status: "pending" | "confirmed" | "cancelled";
  serviceName: string;
  servicePriceCents: number;
  userName: string;
  userEmail: string;
  slotDate: string;
  slotTime: string;
  paymentStatus: string | null;
};

const statusBadge = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "outline",
} as const;

function ConfirmBookingDialog({ row }: { row: BookingRow }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(confirmBooking, null);
  const [open, setOpen] = React.useState(false);
  const canConfirm = row.status === "pending";

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Booking confirmed.");
      router.refresh();
      const timer = setTimeout(() => setOpen(false), 0);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {canConfirm && (
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm">
            Confirm booking
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm booking?</DialogTitle>
          <DialogDescription>
            The customer will receive a confirmation notice.
          </DialogDescription>
        </DialogHeader>
        {state?.message && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="bookingId" value={row.id} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm booking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelBookingDialog({ row }: { row: BookingRow }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(cancelBookingAdmin, null);
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const canCancel = row.status === "pending" || row.status === "confirmed";

  React.useEffect(() => {
    if (state?.ok) {
      const suffix = row.paymentStatus ? " Deposit refunded." : "";
      toast.success(`Booking cancelled.${suffix}`);
      router.refresh();
      const timer = setTimeout(() => setOpen(false), 0);
      return () => clearTimeout(timer);
    }
  }, [state, router, row.paymentStatus]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {canCancel && (
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Cancel booking
          </Button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel booking?</AlertDialogTitle>
          <AlertDialogDescription>
            The slot reopens for others. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state?.message && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Not yet</AlertDialogCancel>
          <form
            ref={formRef}
            action={formAction}
            className="inline-flex"
            aria-label="Cancel booking"
          >
            <input type="hidden" name="bookingId" value={row.id} />
            <AlertDialogAction
              type="submit"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                formRef.current?.requestSubmit();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pending ? "Cancelling…" : "Cancel booking"}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function BookingsTable({
  rows,
}: {
  rows: BookingRow[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[720px] w-full">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Service</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Customer</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date &amp; time</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b transition-colors last:border-b-0 hover:bg-muted/50"
            >
              <td className="px-4 py-3">
                <span className="block text-sm font-medium">{row.serviceName}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatUsd(row.servicePriceCents)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="block max-w-[240px] truncate text-sm font-medium">
                  {row.userName}
                </span>
                <span
                  className="block max-w-[240px] truncate text-xs text-muted-foreground"
                  title={row.userEmail}
                >
                  {row.userEmail}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-sm">
                {formatSlotDate(row.slotDate)}
                <span aria-hidden="true"> · </span>
                {formatSlotTime(row.slotTime)}
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={statusBadge[row.status]}
                  className={row.status === "cancelled" ? "text-muted-foreground" : undefined}
                >
                  {row.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <ConfirmBookingDialog row={row} />
                  <CancelBookingDialog row={row} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
