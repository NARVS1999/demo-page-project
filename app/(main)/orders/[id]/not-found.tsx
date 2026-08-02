import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function OrderNotFound() {
  return <EmptyState title="Page not found" description="This order does not exist." icon={<span className="font-mono text-sm" aria-hidden="true">404</span>} action={<Button asChild variant="outline"><Link href="/shop">Back to the shop</Link></Button>} />;
}
