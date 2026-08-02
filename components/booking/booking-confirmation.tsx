"use client";

// Booking confirmation (client, UI-SPEC Page 3 + Interaction 6/8): summary
// card (Service / Date & time / Price / Deposit / Status), "Notices sent"
// section with the mock-honesty note (omitted when zero notices), and the
// owner-only "Cancel booking" alert-dialog bound to cancelBooking with the
// requestSubmit intercept (Radix AlertDialogAction auto-closes before
// implicit form submission — same fix as components/admin/cms-category-table.tsx
// lines 46-108). Cancel toast carries the deposit suffix: "Booking cancelled."
// or "Booking cancelled. Deposit refunded." (single toast — the suffix only
// when a deposit payment exists, UI-SPEC Interaction 8). After {ok} →
// router.refresh() so the page shows the cancelled badge and the button
// disappears (Interaction 6).

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cancelBooking } from "@/app/(main)/book/actions";
import {
  bookingRef,
  formatSlotDate,
  formatSlotTime,
  formatUsd,
} from "@/lib/booking";
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

const statusBadge = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "outline",
} as const;

const noticeDateFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

// Guests (shareable link, WR-02): mask the owner's email + notice recipients
// so a shared link never discloses the full address or phone number. The owner
// sees them in full. Masking keeps the locked shareable layout intact — only
// the PII is hidden from anonymous visitors.
function maskRecipient(value: string): string {
  if (value.includes("@")) {
    return value.replace(/^(.{2})[^@]*(@.*)$/, "$1•••$2");
  }
  // Phone number: keep the country code + last 3 digits, mask the middle.
  if (value.length > 6) {
    return `${value.slice(0, 3)}•••${value.slice(-3)}`;
  }
  return "•••";
}

export type BookingSummary = {
  id: string;
  status: "pending" | "confirmed" | "cancelled";
  priceCents: number;
  depositPaymentId: string | null;
  paymentAmount: number | null;
  paymentStatus: string | null;
  slotDate: string;
  slotTime: string;
  serviceName: string;
  userEmail: string;
};

export type NoticeRow = {
  recipient: string;
  createdAt: Date;
};

export type BookingNotices = {
  emails: (NoticeRow & { subject: string; body: string })[];
  sms: (NoticeRow & { message: string })[];
};

function CancelBookingDialog({
  booking,
}: {
  booking: BookingSummary;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(cancelBooking, null);
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.ok) {
      const suffix = booking.depositPaymentId ? " Deposit refunded." : "";
      toast.success(`Booking cancelled.${suffix}`);
      router.refresh();
      const timer = setTimeout(() => setOpen(false), 0);
      return () => clearTimeout(timer);
    }
  }, [state, router, booking.depositPaymentId]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          Cancel booking
        </Button>
      </AlertDialogTrigger>
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
            <input type="hidden" name="bookingId" value={booking.id} />
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

export function BookingConfirmation({
  booking,
  notices,
  isOwner,
  canCancel,
}: {
  booking: BookingSummary;
  notices: BookingNotices;
  isOwner: boolean;
  canCancel: boolean;
}) {
  const badgeVariant = statusBadge[booking.status];
  const hasNotices = notices.emails.length > 0 || notices.sms.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="border-b-2 border-primary font-mono text-xs uppercase tracking-[0.28em] text-primary">
          Booking reference
          <span aria-hidden="true"> </span>
          <span className="normal-case tracking-normal text-muted-foreground">
            {bookingRef(booking.id)}
          </span>
        </p>
        <div className="h-px w-full bg-muted-foreground/40" />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-4xl font-bold tracking-tight">Booking details</h1>
          <Badge
            variant={badgeVariant}
            className={booking.status === "cancelled" ? "text-muted-foreground" : undefined}
          >
            {booking.status}
          </Badge>
        </div>
        <p className="text-base text-muted-foreground">
          Sent to {isOwner ? booking.userEmail : maskRecipient(booking.userEmail)}
          <span aria-hidden="true"> · </span>
          {formatSlotDate(booking.slotDate)}
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="divide-y divide-border rounded-xl border">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm text-muted-foreground">Service</span>
            <span className="text-sm">{booking.serviceName}</span>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm text-muted-foreground">Date &amp; time</span>
            <span className="font-mono text-sm">
              {formatSlotDate(booking.slotDate)}
              <span aria-hidden="true"> · </span>
              {formatSlotTime(booking.slotTime)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm text-muted-foreground">Price</span>
            <span className="font-mono text-sm">{formatUsd(booking.priceCents)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm text-muted-foreground">Deposit</span>
            <span className="font-mono text-sm">
              {booking.paymentStatus === "refunded"
                ? `Refunded ${formatUsd(booking.paymentAmount ?? 0)}`
                : booking.depositPaymentId
                  ? `Paid ${formatUsd(booking.paymentAmount ?? 0)}`
                  : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className="text-sm capitalize">{booking.status}</span>
          </div>
        </div>

        {hasNotices && (
          <section className="flex flex-col gap-4" aria-label="Notices sent">
            <p className="border-b-2 border-primary font-mono text-xs uppercase tracking-[0.28em] text-primary">
              Notices sent
            </p>
            <div className="h-px w-full bg-muted-foreground/40" />
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Simulated — no real email or SMS was sent.
            </p>
            <ul className="flex flex-col gap-3">
              {notices.emails.map((email, index) => (
                <li
                  key={`email-${index}`}
                  className="flex items-start gap-3 rounded-xl border bg-card p-4"
                >
                  <span className="mt-0.5 shrink-0 text-muted-foreground">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-medium">{email.subject}</span>
                    <span className="truncate font-mono text-xs text-muted-foreground" title={email.recipient}>
                      To {isOwner ? email.recipient : maskRecipient(email.recipient)}
                      <span aria-hidden="true"> · </span>
                      {noticeDateFmt.format(email.createdAt)}
                    </span>
                    <span className="line-clamp-2 text-sm text-muted-foreground">{email.body}</span>
                  </div>
                </li>
              ))}
              {notices.sms.map((sms, index) => (
                <li
                  key={`sms-${index}`}
                  className="flex items-start gap-3 rounded-xl border bg-card p-4"
                >
                  <span className="mt-0.5 shrink-0 text-muted-foreground">
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-medium">Reminder</span>
                    <span className="truncate font-mono text-xs text-muted-foreground" title={sms.recipient}>
                      To {isOwner ? sms.recipient : maskRecipient(sms.recipient)}
                      <span aria-hidden="true"> · </span>
                      {noticeDateFmt.format(sms.createdAt)}
                    </span>
                    <span className="line-clamp-2 text-sm text-muted-foreground">{sms.message}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isOwner && canCancel && (
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="secondary">
              <Link href="/book">Book another</Link>
            </Button>
            <CancelBookingDialog booking={booking} />
          </div>
        )}
      </div>
    </div>
  );
}
