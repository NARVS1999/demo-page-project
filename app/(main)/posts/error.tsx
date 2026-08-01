"use client";

// Posts error boundary + destructive Alert with Retry.
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function PostsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="destructive">
        <AlertDescription>
          Couldn&apos;t load posts. Check your connection and try again.
        </AlertDescription>
      </Alert>
      <div>
        <Button onClick={reset} variant="secondary">
          Retry
        </Button>
      </div>
    </div>
  );
}
