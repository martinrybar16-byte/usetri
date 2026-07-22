import Link from "next/link";
import Image from "next/image";
import { ShoppingBasket, Timer } from "lucide-react";

import type { OfferWithProduct } from "@/server/services/catalog";
import { formatPrice, formatValidity, daysLeft } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function OfferCard({ offer }: { offer: OfferWithProduct }) {
  const endingSoon = daysLeft(offer.validTo) <= 2;

  return (
    <Link href={`/produkty/${offer.product.slug}`} className="group block h-full">
      <Card className="h-full gap-0 overflow-hidden border-border/60 py-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        {/* Image / placeholder */}
        <div className="relative flex aspect-[4/3] items-center justify-center bg-muted/40">
          {offer.imageUrl ? (
            <Image
              src={offer.imageUrl}
              alt={offer.product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain p-3"
            />
          ) : (
            <ShoppingBasket className="size-10 text-muted-foreground/30" />
          )}
          {offer.discountPct != null && (
            <Badge className="absolute top-2 left-2 bg-destructive text-white tabular-nums">
              −{offer.discountPct} %
            </Badge>
          )}
          {endingSoon && (
            <Badge variant="secondary" className="absolute top-2 right-2 gap-1">
              <Timer className="size-3" />
              {formatValidity(offer.validTo)}
            </Badge>
          )}
        </div>

        <CardContent className="space-y-1.5 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {offer.chain.name}
            {offer.product.unitSize ? ` · ${offer.product.unitSize}` : ""}
          </p>
          <p className="line-clamp-2 min-h-10 text-sm leading-5 font-medium">
            {offer.product.name}
          </p>
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-lg font-bold tabular-nums text-destructive">
              {formatPrice(offer.price)}
            </span>
            {offer.originalPrice && (
              <span className="text-sm text-muted-foreground tabular-nums line-through">
                {formatPrice(offer.originalPrice)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
