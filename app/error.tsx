"use client";

// Global error boundary (UI-SPEC error contract).
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <ErrorState
        title="Something went wrong"
        description="This page hit an unexpected error. Try again, or go back."
        action={
          <Button onClick={reset} variant="secondary">
            Try again
          </Button>
        }
      />
    </div>
  );
}
