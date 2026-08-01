// Styled 404 (UI-SPEC copy contract). Blog routes (unknown/draft slug,
// unknown category/tag) land here too — identical 404, no enumeration.
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
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/blog">Back to blog</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
