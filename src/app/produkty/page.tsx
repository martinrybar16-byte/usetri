import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/auth";
import { listCatalogProducts, listCategoryTree } from "@/server/services/catalog";
import { ProductCard } from "@/components/catalog/product-card";
import { SearchBox } from "@/components/search/search-box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Všetky produkty",
  description:
    "Prehľad všetkých produktov — pridajte si do nákupného zoznamu aj tie, ktoré práve nie sú v akcii, a upozorníme vás, keď zlacnejú.",
};

type SearchParams = Promise<{
  kategoria?: string;
  akcia?: string;
  strana?: string;
}>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.strana) || 1);
  const onlyDiscounted = params.akcia === "1";

  const [{ items, total, pageCount }, categories, session] = await Promise.all([
    listCatalogProducts({
      categorySlug: params.kategoria,
      onlyDiscounted,
      page,
    }),
    listCategoryTree(),
    auth(),
  ]);

  const buildUrl = (patch: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = {
      ...params,
      strana: undefined,
      ...patch,
    };
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const qs = next.toString();
    return qs ? `/produkty?${qs}` : "/produkty";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Všetky produkty</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {total.toLocaleString("sk-SK")} produktov — pridajte si do zoznamu aj tie bez
        akcie a dáme vám vedieť, keď zlacnejú.
      </p>

      <div className="mt-5 max-w-xl">
        <SearchBox />
      </div>

      {/* Category filter */}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={buildUrl({ kategoria: undefined })}>
          <Badge
            variant={!params.kategoria ? "default" : "outline"}
            className="cursor-pointer px-3 py-1"
          >
            Všetky kategórie
          </Badge>
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={buildUrl({
              kategoria: params.kategoria === cat.slug ? undefined : cat.slug,
            })}
          >
            <Badge
              variant={params.kategoria === cat.slug ? "default" : "secondary"}
              className="cursor-pointer px-3 py-1 font-normal"
            >
              {cat.icon} {cat.name}
            </Badge>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-1 border-y border-border/60 py-2">
        <Button asChild variant={!onlyDiscounted ? "secondary" : "ghost"} size="sm">
          <Link href={buildUrl({ akcia: undefined })}>Všetky</Link>
        </Button>
        <Button asChild variant={onlyDiscounted ? "secondary" : "ghost"} size="sm">
          <Link href={buildUrl({ akcia: "1" })}>Len v akcii</Link>
        </Button>
      </div>

      <div className="mt-6">
        {items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isLoggedIn={Boolean(session?.user)}
              />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-muted-foreground">
            Nenašli sa žiadne produkty. Skúste inú kategóriu.
          </p>
        )}
      </div>

      {pageCount > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={buildUrl({ strana: String(page - 1) })}>← Predchádzajúca</Link>
            </Button>
          )}
          <span className="px-2 text-sm text-muted-foreground tabular-nums">
            {page} / {pageCount}
          </span>
          {page < pageCount && (
            <Button asChild variant="outline" size="sm">
              <Link href={buildUrl({ strana: String(page + 1) })}>Ďalšia →</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
