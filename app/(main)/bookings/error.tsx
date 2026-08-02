"use client";

// My bookings error boundary.
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

export default function MyBookingsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      title="Something went wrong"
      description="This page hit an unexpected error. Try again, or go back."
      action={
        <Button onClick={reset} variant="secondary">
          Try again
        </Button>
      }
    />
  );
}
