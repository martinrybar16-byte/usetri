import type { Metadata } from "next";
import Link from "next/link";

import { searchOffers, type SearchFilters } from "@/server/services/search";
import { listChains } from "@/server/services/catalog";
import { OfferGrid } from "@/components/catalog/section";
import { SearchBox } from "@/components/search/search-box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Vyhľadávanie",
  description: "Vyhľadávanie zliav v slovenských supermarketoch.",
};

const SORTS = [
  { key: "relevancia", label: "Najrelevantnejšie", value: "relevance" },
  { key: "zlava", label: "Najväčšia zľava", value: "discount" },
  { key: "cena", label: "Najlacnejšie", value: "price" },
  { key: "najnovsie", label: "Najnovšie", value: "newest" },
] as const;

const DISCOUNTS = [20, 30, 40] as const;

const DIETARY = [
  { key: "bio", label: "Bio" },
  { key: "vegan", label: "Vegan" },
  { key: "glutenFree", label: "Bez lepku" },
  { key: "lactoseFree", label: "Bez laktózy" },
] as const;

type SearchParams = Promise<{
  q?: string;
  obchod?: string;
  zlava?: string;
  strava?: string;
  zoradenie?: string;
  strana?: string;
}>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const sort = SORTS.find((s) => s.key === params.zoradenie)?.value ?? "relevance";
  const minDiscount = DISCOUNTS.find((d) => String(d) === params.zlava);
  const dietary = (params.strava?.split(",") ?? []).filter((f): f is (typeof DIETARY)[number]["key"] =>
    DIETARY.some((d) => d.key === f)
  );
  const page = Math.max(1, Number(params.strana) || 1);

  const filters: SearchFilters = {
    chainSlug: params.obchod,
    minDiscount,
    dietary,
    sort,
    page,
  };

  const [results, chains] = await Promise.all([
    query.length >= 2 ? searchOffers(query, filters) : Promise.resolve(null),
    listChains(),
  ]);

  const buildUrl = (patch: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = {
      ...params,
      strana: undefined,
      ...patch,
    };
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    return `/vyhladavanie?${next.toString()}`;
  };

  const toggleDietary = (key: string) => {
    const set = new Set(dietary);
    if (set.has(key as (typeof dietary)[number])) set.delete(key as (typeof dietary)[number]);
    else set.add(key as (typeof dietary)[number]);
    return buildUrl({ strava: set.size > 0 ? [...set].join(",") : undefined });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">
        {query ? `Výsledky pre „${query}“` : "Vyhľadávanie"}
      </h1>

      {/* Mobile search input */}
      <div className="mt-4 max-w-xl lg:hidden">
        <SearchBox autoFocus={!query} />
      </div>

      {query && results && (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            {results.total}{" "}
            {results.total === 1 ? "výsledok" : results.total < 5 ? "výsledky" : "výsledkov"}
          </p>

          {/* Chain filter */}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={buildUrl({ obchod: undefined })}>
              <Badge variant={!params.obchod ? "default" : "outline"} className="cursor-pointer px-3 py-1">
                Všetky obchody
              </Badge>
            </Link>
            {chains
              .filter((c) => c.offerCount > 0)
              .map((chain) => (
                <Link key={chain.id} href={buildUrl({ obchod: params.obchod === chain.slug ? undefined : chain.slug })}>
                  <Badge
                    variant={params.obchod === chain.slug ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1"
                  >
                    {chain.name}
                  </Badge>
                </Link>
              ))}
          </div>

          {/* Discount + dietary filters */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {DISCOUNTS.map((d) => (
              <Link key={d} href={buildUrl({ zlava: minDiscount === d ? undefined : String(d) })}>
                <Badge
                  variant={minDiscount === d ? "default" : "secondary"}
                  className="cursor-pointer px-3 py-1 font-normal tabular-nums"
                >
                  −{d} % a viac
                </Badge>
              </Link>
            ))}
            <span className="mx-1 h-4 w-px bg-border" />
            {DIETARY.map((d) => (
              <Link key={d.key} href={toggleDietary(d.key)}>
                <Badge
                  variant={dietary.includes(d.key) ? "default" : "secondary"}
                  className="cursor-pointer px-3 py-1 font-normal"
                >
                  {d.label}
                </Badge>
              </Link>
            ))}
          </div>

          {/* Sort */}
          <div className="mt-5 flex flex-wrap gap-1 border-y border-border/60 py-2">
            {SORTS.map((s) => (
              <Button key={s.key} asChild variant={sort === s.value ? "secondary" : "ghost"} size="sm">
                <Link href={buildUrl({ zoradenie: s.key })}>{s.label}</Link>
              </Button>
            ))}
          </div>

          <div className="mt-6">
            {results.items.length > 0 ? (
              <OfferGrid offers={results.items} />
            ) : (
              <div className="py-16 text-center">
                <p className="font-medium">Nenašli sme žiadne akcie pre „{query}“.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Skúste kratšie hľadanie alebo skontrolujte preklepy — hľadáme aj s toleranciou preklepov.
                </p>
              </div>
            )}
          </div>

          {results.pageCount > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link href={buildUrl({ strana: String(page - 1) })}>← Predchádzajúca</Link>
                </Button>
              )}
              <span className="px-2 text-sm text-muted-foreground">
                {page} / {results.pageCount}
              </span>
              {page < results.pageCount && (
                <Button asChild variant="outline" size="sm">
                  <Link href={buildUrl({ strana: String(page + 1) })}>Ďalšia →</Link>
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {!query && (
        <p className="mt-6 text-sm text-muted-foreground">
          Zadajte aspoň 2 znaky — hľadáme v produktoch, značkách, kategóriách aj obchodoch.
        </p>
      )}
    </div>
  );
}
