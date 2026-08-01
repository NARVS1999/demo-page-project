// Styled 404 (UI-SPEC copy contract).
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-base text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
