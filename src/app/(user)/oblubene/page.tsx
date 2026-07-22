import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { OfferGrid } from "@/components/catalog/section";
import { WatchedTerms } from "@/components/favorites/watched-terms";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Obľúbené" };

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user) redirect("/prihlasenie");
  const userId = session.user.id;

  const [favorites, watchedTerms] = await Promise.all([
    db.favorite.findMany({ where: { userId } }),
    db.watchedTerm.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  const byType = (type: string) =>
    favorites.filter((f) => f.entityType === type).map((f) => f.entityId);

  const [products, brands, categories, chains, favoriteOffers] = await Promise.all([
    db.product.findMany({ where: { id: { in: byType("PRODUCT") } } }),
    db.brand.findMany({ where: { id: { in: byType("BRAND") } } }),
    db.category.findMany({ where: { id: { in: byType("CATEGORY") } } }),
    db.chain.findMany({ where: { id: { in: byType("CHAIN") } } }),
    db.offer.findMany({
      where: {
        status: "PUBLISHED",
        validTo: { gte: new Date() },
        productId: { in: byType("PRODUCT") },
      },
      orderBy: { discountPct: { sort: "desc", nulls: "last" } },
      include: { product: { include: { brand: true, category: true } }, chain: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Obľúbené</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sledované produkty, značky, kategórie a obchody — na nové akcie vás upozorníme.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Sledované výrazy</CardTitle>
          <CardDescription>
            Upozorníme vás, keď sa výraz objaví v názve akciového produktu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WatchedTerms terms={watchedTerms} />
        </CardContent>
      </Card>

      {favoriteOffers.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold tracking-tight">
            Vaše produkty práve v akcii
          </h2>
          <OfferGrid offers={favoriteOffers} />
        </section>
      )}

      {(brands.length > 0 || categories.length > 0 || chains.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight">Sledujete</h2>
          <div className="flex flex-wrap gap-2">
            {chains.map((chain) => (
              <Link key={chain.id} href={`/obchody/${chain.slug}`}>
                <Badge variant="secondary" className="px-3 py-1">🏬 {chain.name}</Badge>
              </Link>
            ))}
            {brands.map((brand) => (
              <Link key={brand.id} href={`/vyhladavanie?q=${encodeURIComponent(brand.name)}`}>
                <Badge variant="secondary" className="px-3 py-1">🏷️ {brand.name}</Badge>
              </Link>
            ))}
            {categories.map((category) => (
              <Link key={category.id} href={`/kategorie/${category.slug}`}>
                <Badge variant="secondary" className="px-3 py-1">
                  {category.icon} {category.name}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      {favorites.length === 0 && watchedTerms.length === 0 && (
        <p className="rounded-xl border border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
          Zatiaľ nič nesledujete. Otvorte si{" "}
          <Link href="/zlavy" className="font-medium text-primary hover:underline">
            zľavy
          </Link>{" "}
          a pridajte produkty srdiečkom.
        </p>
      )}

      {products.length > favoriteOffers.length && (
        <p className="text-sm text-muted-foreground">
          {products.length - new Set(favoriteOffers.map((o) => o.productId)).size}{" "}
          sledovaných produktov momentálne nie je v akcii — upozorníme vás, keď budú.
        </p>
      )}
    </div>
  );
}
