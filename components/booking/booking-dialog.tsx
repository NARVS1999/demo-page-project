"use client";

// Booking confirm dialog (client, UI-SPEC Page 3 + Interaction 4/8 + a11y 4):
// Radix dialog max-w-md — title "Confirm your booking", divide-y summary rows
// (Service / Date & time / Price), deposit checkbox (25% via depositCents),
// hidden slotId + checkbox bound to createBooking via useActionState.
// Success → toast "Booking confirmed." → router.push(`/booking/{id}`).
// Conflict ("That slot was just taken.") → destructive Alert, then the dialog
// closes + router.refresh() + onConflict clears the parent's selection
// (Interaction 3 — the refreshed list shows the new taken state). Payment
// failure → destructive Alert, dialog stays open (retryable). Pending →
// buttons disabled + Loader2. The message copy comes verbatim from the
// action's FormState.message — this dialog renders what the server says.

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createBooking } from "@/app/(main)/book/actions";
import { depositCents, formatSlotDate, formatSlotTime, formatUsd } from "@/lib/booking";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CONFLICT_MESSAGE = "That slot was just taken.";

export function BookingDialog({
  open,
  onOpenChange,
  service,
  slot,
  price,
  onConflict,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: { name: string };
  slot: { id: string; date: string; time: string };
  price: number; // priceCents
  /** Called when the action reports the atomic conflict — the parent clears
   *  its selected slot so the refreshed availability list shows the taken
   *  pill (UI-SPEC Interaction 3: conflict → refreshed list is the next step). */
  onConflict?: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createBooking, null);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Booking confirmed.");
      router.push(`/booking/${state.bookingId}`);
      return;
    }
    // Conflict only — the refreshed list is the next step (Interaction 3).
    if (state.message === CONFLICT_MESSAGE) {
      router.refresh();
      const timer = setTimeout(() => {
        onOpenChange(false);
        onConflict?.();
      }, 0);
      return () => clearTimeout(timer);
    }
    // Payment failure keeps the dialog open — retryable (Interaction 1).
  }, [state, router, onOpenChange, onConflict]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm your booking</DialogTitle>
          <DialogDescription>
            Review the details before confirming.
          </DialogDescription>
        </DialogHeader>

        {state?.message && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="slotId" value={slot.id} />

          <div className="divide-y divide-border rounded-lg border">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="text-sm text-muted-foreground">Service</span>
              <span className="text-right text-sm">{service.name}</span>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="text-sm text-muted-foreground">Date &amp; time</span>
              <span className="font-mono text-sm">
                {formatSlotDate(slot.date)}
                <span aria-hidden="true"> · </span>
                {formatSlotTime(slot.time)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="text-sm text-muted-foreground">Price</span>
              <span className="font-mono text-sm">{formatUsd(price)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox id="deposit" name="deposit" />
            <Label htmlFor="deposit" className="text-sm text-foreground">
              Pay 25% deposit ({formatUsd(depositCents(price))}) to hold your spot —
              refundable if you cancel.
            </Label>
          </div>
          {state?.errors?.deposit && (
            <p className="text-sm text-destructive">{state.errors.deposit[0]}</p>
          )}
          {state?.errors?.slotId && (
            <p className="text-sm text-destructive">{state.errors.slotId[0]}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Not yet
            </Button>
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
