import Link from "next/link";
import { Coffee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/blog/cover-image";
import { formatShopPrice, type CatalogProduct } from "@/lib/shop";

function stockLabel(inventory: number): string {
  if (inventory === 0) return "Sold out";
  if (inventory <= 5) return `Only ${inventory} left`;
  return "In stock";
}

export function ProductCard({ product }: { product: CatalogProduct }) {
  const stock = stockLabel(product.inventory);
  return (
    <article className="flex min-w-0 flex-col border border-border bg-card">
      <div className="border-b border-border">
        {product.imageUrl ? (
          <CoverImage
            src={product.imageUrl}
            alt={`Photo of ${product.name}`}
            className="aspect-square w-full"
          />
        ) : (
          <div
            className="flex aspect-square w-full items-center justify-center bg-muted text-muted-foreground"
            aria-hidden="true"
          >
            <Coffee className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.12em]">
          {product.categoryName}
        </Badge>
        <h2 className="font-serif text-2xl font-bold leading-snug tracking-tight">
          <Link href={`/shop/${product.slug}`} className="hover:text-primary">
            {product.name}
          </Link>
        </h2>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        <div className="mt-auto flex items-end justify-between gap-4 border-t border-border pt-4">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-lg">{formatShopPrice(product.priceCents)}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {stock}
            </span>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/shop/${product.slug}`}>View product</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
