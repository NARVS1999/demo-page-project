"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

export default function OrderError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState title="Something went wrong" description="This order could not be loaded. Try again." action={<Button variant="outline" onClick={reset}>Try again</Button>} />;
}
