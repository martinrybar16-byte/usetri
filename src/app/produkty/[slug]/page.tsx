import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight, ShoppingBasket, Store, Tag } from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getProductBySlug } from "@/server/services/catalog";
import { formatPrice, formatShortDate, formatValidity } from "@/lib/format";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { AddToListButton } from "@/components/lists/add-to-list-button";
import { RatingButtons } from "@/components/catalog/rating-buttons";
import { PriceChart } from "@/components/catalog/price-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OfferSection } from "@/components/catalog/section";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) return {};
  const best = data.activeOffers[0];
  return {
    title: best
      ? `${data.product.name} v akcii za ${formatPrice(best.price)}`
      : data.product.name,
    description: `Aktuálne akcie a ceny: ${data.product.name}. Porovnanie cien v slovenských supermarketoch.`,
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) notFound();

  const { product, activeOffers, pastOffers, similar } = data;
  const best = activeOffers[0];
  const attributes = (product.attributes ?? {}) as Record<string, boolean>;

  const session = await auth();
  const ratingCounts = best
    ? Object.fromEntries(
        (
          await db.rating.groupBy({ by: ["value"], where: { offerId: best.id }, _count: true })
        ).map((g) => [g.value, g._count])
      )
    : {};
  const favorited = session?.user
    ? Boolean(
        await db.favorite.findUnique({
          where: {
            userId_entityType_entityId: {
              userId: session.user.id,
              entityType: "PRODUCT",
              entityId: product.id,
            },
          },
        })
      )
    : false;

  const jsonLd = best
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
        offers: activeOffers.map((o) => ({
          "@type": "Offer",
          price: Number(o.price),
          priceCurrency: o.currency,
          priceValidUntil: o.validTo.toISOString().slice(0, 10),
          availability: "https://schema.org/InStock",
          seller: { "@type": "Organization", name: o.chain.name },
        })),
      }
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* Breadcrumbs */}
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Domov</Link>
        <ChevronRight className="size-3.5" />
        <Link href="/zlavy" className="hover:text-foreground">Zľavy</Link>
        {product.category && (
          <>
            <ChevronRight className="size-3.5" />
            <Link
              href={`/kategorie/${product.category.slug}`}
              className="hover:text-foreground"
            >
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[2fr_3fr]">
        {/* Image */}
        <div className="relative flex aspect-square items-center justify-center rounded-2xl border border-border/60 bg-muted/30">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-contain p-8"
              priority
            />
          ) : (
            <ShoppingBasket className="size-20 text-muted-foreground/25" />
          )}
          {best?.discountPct != null && (
            <Badge className="absolute top-4 left-4 bg-destructive px-3 py-1 text-base text-white tabular-nums">
              −{best.discountPct} %
            </Badge>
          )}
        </div>

        {/* Info */}
        <div>
          {product.brand && (
            <Link
              href={`/zlavy?znacka=${product.brand.slug}`}
              className="text-sm font-medium text-primary"
            >
              {product.brand.name}
            </Link>
          )}
          <div className="mt-1 flex items-start justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-balance">
              {product.name}
            </h1>
            <div className="flex shrink-0 gap-2">
              <AddToListButton
                productId={product.id}
                isLoggedIn={Boolean(session?.user)}
              />
              <FavoriteButton
                entityType="PRODUCT"
                entityId={product.id}
                initialFavorited={favorited}
                isLoggedIn={Boolean(session?.user)}
                label="Sledovať"
              />
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[product.unitSize, product.category?.name].filter(Boolean).join(" · ")}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {attributes.bio && <Badge variant="outline">Bio</Badge>}
            {attributes.vegan && <Badge variant="outline">Vegan</Badge>}
            {attributes.glutenFree && <Badge variant="outline">Bez lepku</Badge>}
            {attributes.lactoseFree && <Badge variant="outline">Bez laktózy</Badge>}
          </div>

          {best ? (
            <div className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-5">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold tabular-nums text-destructive">
                  {formatPrice(best.price)}
                </span>
                {best.originalPrice && (
                  <span className="text-xl text-muted-foreground tabular-nums line-through">
                    {formatPrice(best.originalPrice)}
                  </span>
                )}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Store className="size-4" />
                {best.chain.name} · platí {formatValidity(best.validTo)}
                {best.conditions ? ` · ${best.conditions}` : ""}
              </p>
              {best.originalPrice && (
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary">
                  <Tag className="size-4" />
                  Ušetríte {formatPrice(Number(best.originalPrice) - Number(best.price))}
                </p>
              )}
              <div className="mt-4 border-t border-border/60 pt-3">
                <RatingButtons
                  offerId={best.id}
                  isLoggedIn={Boolean(session?.user)}
                  initialCounts={ratingCounts}
                />
              </div>
            </div>
          ) : (
            <p className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-5 text-sm text-muted-foreground">
              Tento produkt momentálne nie je v akcii. Sledujte ho a dáme vám vedieť.
            </p>
          )}

          {/* All current offers (alternative stores) */}
          {activeOffers.length > 1 && (
            <div className="mt-6">
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                V akcii aj v ďalších obchodoch
              </h2>
              <div className="divide-y divide-border/60 rounded-xl border border-border/60">
                {activeOffers.slice(1).map((offer) => (
                  <div key={offer.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium">{offer.chain.name}</span>
                    <span className="text-sm text-muted-foreground">
                      platí {formatValidity(offer.validTo)}
                    </span>
                    <span className="font-bold tabular-nums">{formatPrice(offer.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Price history */}
      {pastOffers.length > 0 && (
        <Card className="mt-10 border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">História cien</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <PriceChart
                points={pastOffers.map((entry) => ({
                  date: entry.recordedAt,
                  price: Number(entry.price),
                }))}
              />
            </div>
            <div className="divide-y divide-border/60">
              {pastOffers.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-muted-foreground">
                    {formatShortDate(entry.recordedAt)} · {entry.chain.name}
                  </span>
                  <span className="flex items-baseline gap-2">
                    {entry.discountPct != null && (
                      <Badge variant="secondary" className="tabular-nums">−{entry.discountPct} %</Badge>
                    )}
                    <span className="font-semibold tabular-nums">{formatPrice(entry.price)}</span>
                  </span>
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground">
              Históriu cien zbierame od prvého zverejnenia ponuky.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mt-4">
        <OfferSection title="Podobné produkty v akcii" offers={similar} />
      </div>
    </div>
  );
}
