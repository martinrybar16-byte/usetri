import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, Store, Split } from "lucide-react";

import { auth } from "@/auth";
import { getListComparison } from "@/server/services/lists";
import { formatPrice } from "@/lib/format";
import { AddItemForm } from "@/components/lists/add-item-form";
import { ListItemRow } from "@/components/lists/list-item-row";
import { DeleteListButton } from "@/components/lists/delete-list-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Nákupný zoznam" };

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/prihlasenie");

  const { id } = await params;
  const data = await getListComparison(id, session.user.id);
  if (!data) notFound();

  const { list, comparison } = data;
  const { chainTotals, best, bestSplit, splitSavings, unpricedItems } = comparison;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/zoznamy" className="hover:text-foreground">Zoznamy</Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{list.name}</span>
      </nav>

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{list.name}</h1>
        <DeleteListButton listId={list.id} />
      </div>

      <AddItemForm listId={list.id} />

      {/* Items */}
      {comparison.items.length > 0 ? (
        <div className="divide-y divide-border/60 rounded-xl border border-border/60">
          {comparison.items.map(({ item, bestPrice, priceByChain }) => {
            const bestChainId =
              bestPrice != null
                ? [...priceByChain.entries()].find(([, p]) => p === bestPrice)?.[0]
                : null;
            const bestChain = bestChainId
              ? chainTotals.find((c) => c.chainId === bestChainId)?.chainName ?? null
              : null;
            return (
              <ListItemRow
                key={item.id}
                itemId={item.id}
                name={item.product?.name ?? item.freeText ?? "Položka"}
                productSlug={item.product?.slug ?? null}
                quantity={Number(item.quantity)}
                unitSize={item.product?.unitSize ?? null}
                checked={item.checked}
                bestPrice={bestPrice != null ? formatPrice(bestPrice) : null}
                bestChain={bestChain}
              />
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
          Zoznam je prázdny — pridajte položky vyššie.
        </p>
      )}

      {/* Comparison */}
      {chainTotals.length > 0 && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="size-5 text-primary" />
              Porovnanie obchodov
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y divide-border/60">
              {chainTotals.map((chain, i) => (
                <div key={chain.chainId} className="flex items-center gap-3 py-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: chain.color ?? "#999" }}
                  />
                  <span className="text-sm font-medium">{chain.chainName}</span>
                  {i === 0 && <Badge className="px-2 py-0">najvýhodnejšie</Badge>}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {chain.covered}/{comparison.pricedItemCount} položiek
                  </span>
                  <span className="w-20 text-right font-bold tabular-nums">
                    {formatPrice(chain.total)}
                  </span>
                </div>
              ))}
            </div>

            {best && (
              <p className="rounded-lg bg-primary/10 px-3 py-2.5 text-sm">
                💡 Nákup všetkého v <strong>{best.chainName}</strong> vás vyjde na{" "}
                <strong>{formatPrice(best.total)}</strong>
                {best.covered < comparison.pricedItemCount &&
                  ` (pokryje ${best.covered} z ${comparison.pricedItemCount} položiek v akcii)`}
                .
              </p>
            )}

            {bestSplit &&
              best &&
              (splitSavings != null && splitSavings > 0.005 ? (
                <p className="flex items-start gap-2 rounded-lg bg-primary/10 px-3 py-2.5 text-sm">
                  <Split className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Rozdelenie nákupu medzi{" "}
                    <strong>{bestSplit.chains[0].chainName}</strong> a{" "}
                    <strong>{bestSplit.chains[1].chainName}</strong> ušetrí ďalších{" "}
                    <strong>{formatPrice(splitSavings)}</strong> (spolu{" "}
                    {formatPrice(bestSplit.total)}).
                  </span>
                </p>
              ) : bestSplit.covered > best.covered ? (
                <p className="flex items-start gap-2 rounded-lg bg-primary/10 px-3 py-2.5 text-sm">
                  <Split className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Kombinácia <strong>{bestSplit.chains[0].chainName}</strong> +{" "}
                    <strong>{bestSplit.chains[1].chainName}</strong> pokryje{" "}
                    <strong>
                      {bestSplit.covered} z {comparison.pricedItemCount}
                    </strong>{" "}
                    položiek v akcii (spolu {formatPrice(bestSplit.total)}).
                  </span>
                </p>
              ) : null)}

            {unpricedItems.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {unpricedItems.length}{" "}
                {unpricedItems.length === 1 ? "položka" : "položky"} bez aktuálnej
                akcie sa do porovnania nepočíta:{" "}
                {unpricedItems
                  .map((i) => i.product?.name ?? i.freeText)
                  .filter(Boolean)
                  .join(", ")}
                .
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
