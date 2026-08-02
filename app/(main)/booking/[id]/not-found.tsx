// /booking/[id] not-found — styled booking 404 (UI-SPEC Copywriting Contract):
// "Page not found" + primary "Back to services" (→ /services) + ghost
// "Back to home". Rendered for unknown ids, cancelled-and-cleaned bookings,
// and non-UUID ids (the page guards with isUuid → notFound()).

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

export default function BookingNotFound() {
  return (
    <ErrorState
      title="Page not found"
      description="This booking could not be found."
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/services">Back to services</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      }
    />
  );
}
