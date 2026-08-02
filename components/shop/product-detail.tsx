"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/(main)/shop/actions";
import { formatShopPrice, type CatalogProduct } from "@/lib/shop";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CoverImage } from "@/components/blog/cover-image";

function stockLabel(inventory: number): string {
  if (inventory === 0) return "Sold out";
  if (inventory <= 5) return `Only ${inventory} left`;
  return "In stock";
}

export function ProductDetail({ product }: { product: CatalogProduct }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(addToCart, null);
  const soldOut = product.inventory === 0;
  const quantityError = state?.errors?.quantity?.[0];

  React.useEffect(() => {
    if (!state?.ok) return;
    toast.success("Added to cart.");
    router.refresh();
  }, [state, router]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.12em]">
          {product.categoryName}
        </Badge>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Northstar Coffee
        </span>
      </div>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:items-start">
        <div className="border border-border">
          {product.imageUrl ? (
            <CoverImage
              src={product.imageUrl}
              alt={`Photo of ${product.name}`}
              className="aspect-square w-full"
            />
          ) : (
            <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground" aria-hidden="true">
              <ShoppingBag className="h-12 w-12" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">{product.name}</h1>
            <p className="text-base leading-7 text-muted-foreground">{product.description}</p>
            <p className="font-mono text-2xl">{formatShopPrice(product.priceCents)}</p>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {stockLabel(product.inventory)}
            </p>
          </div>

          {state?.message && (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <form action={formAction} className="flex flex-col gap-4 border-t border-border pt-6">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="next" value={`/shop/${product.slug}`} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="shop-quantity">Quantity</Label>
              <Input
                id="shop-quantity"
                name="quantity"
                type="number"
                min="1"
                step="1"
                defaultValue="1"
                disabled={pending || soldOut}
                aria-invalid={quantityError ? true : undefined}
                aria-describedby={quantityError ? "shop-quantity-error" : "shop-quantity-hint"}
              />
              <p id="shop-quantity-hint" className="text-xs text-muted-foreground">
                Add one size: the product price is fixed.
              </p>
              {quantityError && (
                <p id="shop-quantity-error" className="text-sm text-destructive" role="alert">
                  {quantityError}
                </p>
              )}
            </div>
            <Button type="submit" size="lg" disabled={pending || soldOut}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {pending ? "Adding…" : "Add to cart"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
