import "server-only";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { OfferWithProduct } from "@/server/services/catalog";

/**
 * Typo-tolerant search built on pg_trgm + unaccent (see migration
 * 20260714111523_search_extensions). Functions/operators are schema-qualified
 * because Supabase installs extensions into the "extensions" schema.
 *
 * Implements the SearchService seam from ARCHITECTURE.md §9 — swap this module
 * for Meilisearch when scale demands it; call sites stay unchanged.
 */

export function normalizeQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .slice(0, 100);
}

type RankedProduct = { id: string; rank: number };

/** Ranked product ids matching the query (name, brand, or category). */
async function rankProducts(normQuery: string, limit = 200): Promise<RankedProduct[]> {
  if (normQuery.length < 2) return [];

  // word_similarity (<%) matches the query against the best-matching word
  // inside the name — that's what makes "cokolda" find "čokoláda".
  return db.$queryRaw<RankedProduct[]>(Prisma.sql`
    SELECT
      p.id,
      GREATEST(
        extensions.word_similarity(${normQuery}, p."normalizedName"),
        COALESCE(extensions.word_similarity(${normQuery}, extensions.unaccent(lower(b.name))), 0) * 0.9,
        COALESCE(extensions.word_similarity(${normQuery}, extensions.unaccent(lower(c.name))), 0) * 0.8
      )::float AS rank
    FROM "Product" p
    LEFT JOIN "Brand" b ON b.id = p."brandId"
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    WHERE p.status = 'ACTIVE' AND (
      -- 0.28 threshold: letter-swap typos score ≈0.29 ("mileko"→"mlieko");
      -- looser matches surface but ranking keeps the best on top.
      extensions.word_similarity(${normQuery}, p."normalizedName") > 0.28
      OR p."normalizedName" ILIKE '%' || ${normQuery} || '%'
      OR extensions.unaccent(lower(b.name)) ILIKE '%' || ${normQuery} || '%'
      OR extensions.unaccent(lower(c.name)) ILIKE '%' || ${normQuery} || '%'
    )
    ORDER BY rank DESC
    LIMIT ${limit}
  `);
}

// ─────────────────────────── Full search ─────────────────────────────

export type SearchFilters = {
  chainSlug?: string;
  minDiscount?: number;
  dietary?: ("bio" | "vegan" | "glutenFree" | "lactoseFree")[];
  sort?: "relevance" | "discount" | "price" | "newest";
  page?: number;
  pageSize?: number;
};

export async function searchOffers(query: string, filters: SearchFilters = {}) {
  const {
    chainSlug,
    minDiscount,
    dietary = [],
    sort = "relevance",
    page = 1,
    pageSize = 24,
  } = filters;

  const normQuery = normalizeQuery(query);
  const ranked = await rankProducts(normQuery);
  if (ranked.length === 0) {
    return { items: [] as OfferWithProduct[], total: 0, page: 1, pageCount: 0 };
  }
  const rankById = new Map(ranked.map((r, i) => [r.id, i]));

  const where: Prisma.OfferWhereInput = {
    status: "PUBLISHED",
    validTo: { gte: new Date() },
    productId: { in: ranked.map((r) => r.id) },
  };
  if (chainSlug) where.chain = { slug: chainSlug };
  if (minDiscount) where.discountPct = { gte: minDiscount };
  if (dietary.length > 0) {
    where.AND = dietary.map((flag) => ({
      product: { attributes: { path: [flag], equals: true } },
    }));
  }

  const offers = await db.offer.findMany({
    where,
    include: { product: { include: { brand: true, category: true } }, chain: true },
  });

  // One offer per product (cheapest), then sort
  const bestByProduct = new Map<string, OfferWithProduct>();
  for (const offer of offers) {
    const current = bestByProduct.get(offer.productId);
    if (!current || Number(offer.price) < Number(current.price)) {
      bestByProduct.set(offer.productId, offer);
    }
  }
  const deduped = [...bestByProduct.values()];

  deduped.sort((a, b) => {
    switch (sort) {
      case "discount":
        return (b.discountPct ?? 0) - (a.discountPct ?? 0);
      case "price":
        return Number(a.price) - Number(b.price);
      case "newest":
        return b.createdAt.getTime() - a.createdAt.getTime();
      default:
        return (rankById.get(a.productId) ?? 999) - (rankById.get(b.productId) ?? 999);
    }
  });

  const total = deduped.length;
  const items = deduped.slice((page - 1) * pageSize, page * pageSize);
  return { items, total, page, pageCount: Math.ceil(total / pageSize) };
}

// ─────────────────────────── Autocomplete ────────────────────────────

export type Suggestions = {
  products: { id: string; name: string; slug: string; unitSize: string | null }[];
  brands: { name: string; slug: string }[];
  categories: { name: string; slug: string; icon: string | null }[];
  chains: { name: string; slug: string }[];
};

export async function suggest(query: string): Promise<Suggestions> {
  const normQuery = normalizeQuery(query);
  if (normQuery.length < 2) {
    return { products: [], brands: [], categories: [], chains: [] };
  }

  const [ranked, brands, categories, chains] = await Promise.all([
    rankProducts(normQuery, 5),
    db.$queryRaw<{ name: string; slug: string }[]>(Prisma.sql`
      SELECT name, slug FROM "Brand"
      WHERE extensions.unaccent(lower(name)) ILIKE '%' || ${normQuery} || '%'
         OR ${normQuery} OPERATOR(extensions.<%) extensions.unaccent(lower(name))
      ORDER BY extensions.word_similarity(${normQuery}, extensions.unaccent(lower(name))) DESC
      LIMIT 3
    `),
    db.$queryRaw<{ name: string; slug: string; icon: string | null }[]>(Prisma.sql`
      SELECT name, slug, icon FROM "Category"
      WHERE extensions.unaccent(lower(name)) ILIKE '%' || ${normQuery} || '%'
      LIMIT 3
    `),
    db.$queryRaw<{ name: string; slug: string }[]>(Prisma.sql`
      SELECT name, slug FROM "Chain"
      WHERE active = true
        AND extensions.unaccent(lower(name)) ILIKE '%' || ${normQuery} || '%'
      LIMIT 2
    `),
  ]);

  const products =
    ranked.length > 0
      ? await db.product.findMany({
          where: { id: { in: ranked.map((r) => r.id) } },
          select: { name: true, slug: true, unitSize: true, id: true },
        })
      : [];
  const order = new Map(ranked.map((r, i) => [r.id, i]));
  products.sort((a, b) => (order.get(a.id) ?? 9) - (order.get(b.id) ?? 9));

  return {
    products: products.map(({ id, name, slug, unitSize }) => ({ id, name, slug, unitSize })),
    brands,
    categories,
    chains,
  };
}
