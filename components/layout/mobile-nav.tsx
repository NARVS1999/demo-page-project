"use client";

// Mobile nav (client): hamburger opens a right-side Sheet with the same links
// as the desktop header. Receives serializable auth state from the server header.

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SITE } from "@/lib/site";

export function MobileNav({
  user,
}: {
  user: { name: string; email: string } | null;
}) {
  const [open, setOpen] = React.useState(false);

  const links = user
    ? [
        { label: "Home", href: "/" },
        { label: "Blog", href: "/blog" },
        { label: "Services", href: "/services" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Posts", href: "/posts" },
        { label: "Admin", href: "/admin" },
      ]
    : [
        { label: "Home", href: "/" },
        { label: "Blog", href: "/blog" },
        { label: "Services", href: "/services" },
        { label: "Sign in", href: "/login" },
      ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetTitle className="sr-only">{SITE.name} navigation</SheetTitle>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-base font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          {user ? null : (
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md bg-primary px-3 py-2 text-center text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get started
            </Link>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
