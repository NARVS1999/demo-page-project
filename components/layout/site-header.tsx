// Site header (server component): sticky, backdrop-blur, border-b.
// Nav adapts to auth state via getCurrentUser(); guest sees Sign in / Get
// started, authenticated sees Posts / Admin + a user dropdown.
// Client behavior (user menu, mobile sheet) lives in client companions that
// receive serializable props only.

import Link from "next/link";
import { Blocks } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { SITE } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileNav } from "@/components/layout/mobile-nav";

export async function SiteHeader() {
  const user = await getCurrentUser();

  const desktopNav = user
    ? [
        { label: "Home", href: "/" },
        { label: "Posts", href: "/posts" },
        { label: "Admin", href: "/admin" },
      ]
    : [{ label: "Home", href: "/" }];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary">
              <Blocks className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
            </span>
            <span className="font-mono text-sm font-bold uppercase tracking-[0.18em]">
              {SITE.name}
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
            {desktopNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden md:block">
            {user ? (
              <UserMenu user={{ name: user.name, email: user.email }} />
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">Get started</Link>
                </Button>
              </div>
            )}
          </div>
          <div className="md:hidden">
            <MobileNav
              user={
                user
                  ? { name: user.name, email: user.email }
                  : null
              }
            />
          </div>
        </div>
      </div>
    </header>
  );
}
