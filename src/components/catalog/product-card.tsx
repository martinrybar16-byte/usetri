import Link from "next/link";
import Image from "next/image";
import { ShoppingBasket } from "lucide-react";

import type { CatalogProduct } from "@/server/services/catalog";
import { formatPrice } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuickAddButton } from "@/components/lists/quick-add-button";

/**
 * Catalog tile: works for products with and without an active discount —
 * that's the difference from OfferCard, which always has an offer.
 */
export function ProductCard({
  product,
  isLoggedIn,
}: {
  product: CatalogProduct;
  isLoggedIn: boolean;
}) {
  const offer = product.offers[0];

  return (
    <Card className="h-full gap-0 overflow-hidden border-border/60 py-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/produkty/${product.slug}`} className="block">
        <div className="relative flex aspect-[4/3] items-center justify-center bg-muted/40">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain p-3"
            />
          ) : (
            <ShoppingBasket className="size-10 text-muted-foreground/30" />
          )}
          {offer?.discountPct != null && (
            <Badge className="absolute top-2 left-2 bg-destructive text-white tabular-nums">
              −{offer.discountPct} %
            </Badge>
          )}
        </div>
      </Link>

      <CardContent className="space-y-1.5 p-3">
        <p className="text-xs font-medium text-muted-foreground">
          {[product.brand?.name, product.unitSize].filter(Boolean).join(" · ") || " "}
        </p>
        <Link href={`/produkty/${product.slug}`}>
          <p className="line-clamp-2 min-h-10 text-sm leading-5 font-medium hover:underline">
            {product.name}
          </p>
        </Link>

        <div className="flex items-end justify-between gap-2 pt-0.5">
          <div className="min-w-0">
            {offer ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold tabular-nums text-destructive">
                  {formatPrice(offer.price)}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {offer.chain.name}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Momentálne bez akcie</span>
            )}
          </div>
          <QuickAddButton productId={product.id} isLoggedIn={isLoggedIn} />
        </div>
      </CardContent>
    </Card>
  );
}
