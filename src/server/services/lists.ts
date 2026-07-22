import "server-only";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Shopping-list price comparison (ARCHITECTURE.md §8.5).
 * For a list we compute, over currently active offers:
 *  - per-chain totals + coverage (how many list items that chain has in action)
 *  - best single store (max coverage, then min total)
 *  - best 2-store split (exact — with ~10 chains it's ≤45 pairs)
 */

export type ListItemWithProduct = Prisma.ShoppingListItemGetPayload<{
  include: { product: { include: { brand: true } } };
}>;

export type ItemPricing = {
  item: ListItemWithProduct;
  // chainId → cheapest active offer price for this product (unit price × qty)
  priceByChain: Map<string, number>;
  bestPrice: number | null;
  originalTotal: number | null; // qty × originalPrice of cheapest offer
};

export type ChainTotal = {
  chainId: string;
  chainName: string;
  chainSlug: string;
  color: string | null;
  total: number;
  covered: number; // items this chain can price
};

export type SplitResult = {
  chains: [ChainTotal, ChainTotal];
  total: number;
  covered: number;
};

export type ListComparison = {
  items: ItemPricing[];
  pricedItemCount: number;
  unpricedItems: ListItemWithProduct[];
  chainTotals: ChainTotal[];
  best: ChainTotal | null;
  bestSplit: SplitResult | null;
  splitSavings: number | null; // vs best single store, same coverage or better
};

export async function getListComparison(listId: string, userId: string) {
  const list = await db.shoppingList.findFirst({
    where: { id: listId, userId },
    include: {
      items: {
        orderBy: { addedAt: "asc" },
        include: { product: { include: { brand: true } } },
      },
    },
  });
  if (!list) return null;

  const productIds = list.items
    .map((i) => i.productId)
    .filter((id): id is string => Boolean(id));

  const offers = productIds.length
    ? await db.offer.findMany({
        where: {
          productId: { in: productIds },
          status: "PUBLISHED",
          validTo: { gte: new Date() },
        },
        include: { chain: true },
      })
    : [];

  const chains = new Map<
    string,
    { chainName: string; chainSlug: string; color: string | null }
  >();
  for (const offer of offers) {
    chains.set(offer.chainId, {
      chainName: offer.chain.name,
      chainSlug: offer.chain.slug,
      color: offer.chain.color,
    });
  }

  // Cheapest offer per product per chain
  const items: ItemPricing[] = list.items.map((item) => {
    const priceByChain = new Map<string, number>();
    let bestPrice: number | null = null;
    let originalTotal: number | null = null;
    if (item.productId) {
      const qty = Number(item.quantity) || 1;
      for (const offer of offers.filter((o) => o.productId === item.productId)) {
        const price = Number(offer.price) * qty;
        const current = priceByChain.get(offer.chainId);
        if (current == null || price < current) priceByChain.set(offer.chainId, price);
        if (bestPrice == null || price < bestPrice) {
          bestPrice = price;
          originalTotal = offer.originalPrice ? Number(offer.originalPrice) * qty : null;
        }
      }
    }
    return { item, priceByChain, bestPrice, originalTotal };
  });

  const priced = items.filter((i) => i.priceByChain.size > 0);
  const unpricedItems = items
    .filter((i) => i.priceByChain.size === 0)
    .map((i) => i.item);

  // Per-chain totals with coverage
  const chainTotals: ChainTotal[] = [...chains.entries()].map(([chainId, meta]) => {
    let total = 0;
    let covered = 0;
    for (const item of priced) {
      const price = item.priceByChain.get(chainId);
      if (price != null) {
        total += price;
        covered++;
      }
    }
    return { chainId, ...meta, total: round2(total), covered };
  });
  chainTotals.sort((a, b) => b.covered - a.covered || a.total - b.total);

  const best = chainTotals[0] ?? null;

  // Best 2-store split
  let bestSplit: SplitResult | null = null;
  for (let a = 0; a < chainTotals.length; a++) {
    for (let b = a + 1; b < chainTotals.length; b++) {
      const pair = [chainTotals[a], chainTotals[b]] as [ChainTotal, ChainTotal];
      let total = 0;
      let covered = 0;
      for (const item of priced) {
        const pa = item.priceByChain.get(pair[0].chainId);
        const pb = item.priceByChain.get(pair[1].chainId);
        const min = pa != null && pb != null ? Math.min(pa, pb) : (pa ?? pb);
        if (min != null) {
          total += min;
          covered++;
        }
      }
      total = round2(total);
      if (
        !bestSplit ||
        covered > bestSplit.covered ||
        (covered === bestSplit.covered && total < bestSplit.total)
      ) {
        bestSplit = { chains: pair, total, covered };
      }
    }
  }

  const splitSavings =
    best && bestSplit && bestSplit.covered >= best.covered
      ? round2(best.total - bestSplit.total)
      : null;

  const comparison: ListComparison = {
    items,
    pricedItemCount: priced.length,
    unpricedItems,
    chainTotals,
    best,
    bestSplit,
    splitSavings: splitSavings && splitSavings > 0 ? splitSavings : null,
  };

  return { list, comparison };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
