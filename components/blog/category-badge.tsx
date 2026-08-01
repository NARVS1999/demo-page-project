// Category badge (server): newspaper kicker — mono 10px uppercase primary with
// a bottom rule. Kicker role, not a pill (UI-SPEC Component Inventory).

import Link from "next/link";

export function CategoryBadge({ name, slug }: { name: string; slug: string }) {
  return (
    <Link
      href={`/blog/category/${slug}`}
      className="border-b-2 border-primary font-mono text-[10px] uppercase tracking-[0.24em] text-primary"
    >
      {name}
    </Link>
  );
}
