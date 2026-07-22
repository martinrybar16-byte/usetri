import type { Metadata } from "next";
import Link from "next/link";

import { listOffers, listChains, listCategoryTree } from "@/server/services/catalog";
import { OfferGrid } from "@/components/catalog/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Aktuálne zľavy v slovenských potravinách",
  description:
    "Prehľad všetkých aktuálnych akcií a zliav v Tesco, Lidl, Kaufland, Billa, COOP Jednota a ďalších reťazcoch.",
};

const SORTS = [
  { key: "zlava", label: "Najväčšia zľava", value: "discount" },
  { key: "najnovsie", label: "Najnovšie", value: "newest" },
  { key: "cena", label: "Najlacnejšie", value: "price" },
  { key: "konci", label: "Končia najskôr", value: "endingSoon" },
] as const;

type SearchParams = Promise<{
  obchod?: string;
  kategoria?: string;
  zoradenie?: string;
  strana?: string;
}>;

export default async function OffersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const sort = SORTS.find((s) => s.key === params.zoradenie)?.value ?? "discount";
  const page = Math.max(1, Number(params.strana) || 1);

  const [{ items, total, pageCount }, chains, categories] = await Promise.all([
    listOffers({
      chainSlug: params.obchod,
      categorySlug: params.kategoria,
      sort,
      page,
    }),
    listChains(),
    listCategoryTree(),
  ]);

  const buildUrl = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { ...params, strana: undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const qs = next.toString();
    return qs ? `/zlavy?${qs}` : "/zlavy";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Aktuálne zľavy</h1>
      <p className="mt-1 text-sm text-muted-foreground">{total} akciových ponúk</p>

      {/* Chain filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={buildUrl({ obchod: undefined })}>
          <Badge variant={!params.obchod ? "default" : "outline"} className="cursor-pointer px-3 py-1">
            Všetky obchody
          </Badge>
        </Link>
        {chains
          .filter((c) => c.offerCount > 0)
          .map((chain) => (
            <Link key={chain.id} href={buildUrl({ obchod: chain.slug })}>
              <Badge
                variant={params.obchod === chain.slug ? "default" : "outline"}
                className="cursor-pointer px-3 py-1"
              >
                {chain.name} ({chain.offerCount})
              </Badge>
            </Link>
          ))}
      </div>

      {/* Category filter */}
      <div className="mt-3 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Link key={cat.id} href={buildUrl({ kategoria: params.kategoria === cat.slug ? undefined : cat.slug })}>
            <Badge
              variant={params.kategoria === cat.slug ? "default" : "secondary"}
              className="cursor-pointer px-3 py-1 font-normal"
            >
              {cat.icon} {cat.name}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Sort */}
      <div className="mt-5 flex flex-wrap gap-1 border-y border-border/60 py-2">
        {SORTS.map((s) => (
          <Button
            key={s.key}
            asChild
            variant={sort === s.value ? "secondary" : "ghost"}
            size="sm"
          >
            <Link href={buildUrl({ zoradenie: s.key })}>{s.label}</Link>
          </Button>
        ))}
      </div>

      <div className="mt-6">
        {items.length > 0 ? (
          <OfferGrid offers={items} />
        ) : (
          <p className="py-16 text-center text-muted-foreground">
            Nenašli sa žiadne ponuky. Skúste zmeniť filtre.
          </p>
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={buildUrl({ strana: String(page - 1) })}>← Predchádzajúca</Link>
            </Button>
          )}
          <span className="px-2 text-sm text-muted-foreground">
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
