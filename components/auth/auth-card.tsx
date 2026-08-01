// Auth card: centered card (max-w-md) with logo mark, title, description,
// children, footer link line. Used by (auth) login/register pages.
import Link from "next/link";
import { Blocks } from "lucide-react";
import { SITE } from "@/lib/site";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-none">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary">
          <Blocks className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-base text-muted-foreground">{description}</p>
      </div>
      <div className="mt-6">{children}</div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {footer} · <Link href="/" className="hover:text-foreground">{SITE.name}</Link>
      </p>
    </div>
  );
}
