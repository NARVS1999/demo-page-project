// Site footer: border-t, muted; © year + name left; GitHub / Home / Login right.
import Link from "next/link";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <p>
          © {new Date().getFullYear()} {SITE.name}
        </p>
        <nav className="flex items-center gap-6" aria-label="Footer">
          <Link
            href={SITE.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </Link>
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <Link
            href="/login"
            className="transition-colors hover:text-foreground"
          >
            Login
          </Link>
        </nav>
      </div>
    </footer>
  );
}
