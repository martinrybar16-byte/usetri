import "server-only";

import { db } from "@/lib/db";
import type { OfferWithProduct } from "@/server/services/catalog";

/**
 * Recommendations v1 — deterministic (ARCHITECTURE.md §10 phase 1):
 *  1. active offers on favorite products' categories & brands
 *  2. offers matching watched terms
 *  3. seasonal boost (month-based category weights)
 *  4. fill with deepest discounts the user hasn't favorited
 * Embeddings/collaborative filtering come later once event volume exists.
 */

const SEASONAL_CATEGORIES: Record<number, string[]> = {
  // month (0-based) → boosted category slugs
  4: ["ovocie-zelenina", "mrazene"],
  5: ["maso-ryby", "pivo", "zmrzlina"],
  6: ["maso-ryby", "pivo", "zmrzlina", "voda"],
  7: ["maso-ryby", "pivo", "zmrzlina", "voda"],
  8: ["muka-cukor", "trvanlive-potraviny"],
  11: ["cokolady", "susienky", "muka-cukor", "vino"],
};

export async function getRecommendations(
  userId: string,
  limit = 8
): Promise<OfferWithProduct[]> {
  const [favorites, watchedTerms] = await Promise.all([
    db.favorite.findMany({ where: { userId } }),
    db.watchedTerm.findMany({ where: { userId } }),
  ]);

  const favProductIds = favorites
    .filter((f) => f.entityType === "PRODUCT")
    .map((f) => f.entityId);
  const favBrandIds = new Set(
    favorites.filter((f) => f.entityType === "BRAND").map((f) => f.entityId)
  );
  const favCategoryIds = new Set(
    favorites.filter((f) => f.entityType === "CATEGORY").map((f) => f.entityId)
  );

  // Derive brand/category affinity from favorited products
  if (favProductIds.length > 0) {
    const favProducts = await db.product.findMany({
      where: { id: { in: favProductIds } },
      select: { brandId: true, categoryId: true },
    });
    for (const p of favProducts) {
      if (p.brandId) favBrandIds.add(p.brandId);
      if (p.categoryId) favCategoryIds.add(p.categoryId);
    }
  }

  const seasonalSlugs = SEASONAL_CATEGORIES[new Date().getMonth()] ?? [];
  const seasonalCategories = seasonalSlugs.length
    ? await db.category.findMany({
        where: {
          OR: [
            { slug: { in: seasonalSlugs } },
            { parent: { slug: { in: seasonalSlugs } } },
          ],
        },
        select: { id: true },
      })
    : [];
  const seasonalIds = new Set(seasonalCategories.map((c) => c.id));

  const offers = await db.offer.findMany({
    where: {
      status: "PUBLISHED",
      validTo: { gte: new Date() },
      productId: { notIn: favProductIds }, // already tracked → shown elsewhere
    },
    include: { product: { include: { brand: true, category: true } }, chain: true },
  });

  const scored = offers.map((offer) => {
    let score = (offer.discountPct ?? 0) / 100; // base: discount depth
    if (offer.product.brandId && favBrandIds.has(offer.product.brandId)) score += 2;
    if (offer.product.categoryId && favCategoryIds.has(offer.product.categoryId)) score += 1.5;
    if (offer.product.categoryId && seasonalIds.has(offer.product.categoryId)) score += 0.75;
    if (
      watchedTerms.some((t) => offer.product.normalizedName.includes(t.normalizedTerm))
    ) {
      score += 2.5;
    }
    score += Math.min(offer.favoritesCount, 20) / 40; // light popularity signal
    return { offer, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // One offer per product
  const seen = new Set<string>();
  const result: OfferWithProduct[] = [];
  for (const { offer } of scored) {
    if (seen.has(offer.productId)) continue;
    seen.add(offer.productId);
    result.push(offer);
    if (result.length >= limit) break;
  }
  return result;
}
