"use client";

// /booking/[id] error boundary (client) — error-state + retry (UI-SPEC).

import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";

export default function BookingError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Something went wrong"
      description="The booking could not be loaded. Try again."
      action={
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
      }
    />
  );
}
