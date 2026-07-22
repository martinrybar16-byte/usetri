import "server-only";
import { cache } from "react";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

const OFFER_INCLUDE = {
  product: { include: { brand: true, category: true } },
  chain: true,
} satisfies Prisma.OfferInclude;

export type OfferWithProduct = Prisma.OfferGetPayload<{ include: typeof OFFER_INCLUDE }>;

function activeOfferWhere(): Prisma.OfferWhereInput {
  return { status: "PUBLISHED", validTo: { gte: new Date() } };
}

// ─────────────────────────── Homepage ────────────────────────────────

export const getHomepageData = cache(async () => {
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 3600_000);

  const [topDiscounts, endingSoon, newest, leaflets, chains] = await Promise.all([
    db.offer.findMany({
      where: { ...activeOfferWhere(), discountPct: { not: null } },
      orderBy: { discountPct: "desc" },
      take: 8,
      include: OFFER_INCLUDE,
    }),
    db.offer.findMany({
      where: { ...activeOfferWhere(), validTo: { lte: in48h } },
      orderBy: { validTo: "asc" },
      take: 8,
      include: OFFER_INCLUDE,
    }),
    db.offer.findMany({
      where: activeOfferWhere(),
      orderBy: { createdAt: "desc" },
      take: 8,
      include: OFFER_INCLUDE,
    }),
    db.leaflet.findMany({
      where: { status: "PUBLISHED", validTo: { gte: now } },
      orderBy: { publishedAt: "desc" },
      take: 6,
      include: { chain: true },
    }),
    db.chain.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return { topDiscounts, endingSoon, newest, leaflets, chains };
});

// ──────────────────────────── Offers ─────────────────────────────────

export type OffersFilter = {
  chainSlug?: string;
  categorySlug?: string;
  sort?: "discount" | "newest" | "price" | "endingSoon";
  page?: number;
  pageSize?: number;
};

export async function listOffers(filter: OffersFilter) {
  const { chainSlug, categorySlug, sort = "discount", page = 1, pageSize = 24 } = filter;

  const where: Prisma.OfferWhereInput = { ...activeOfferWhere() };
  if (chainSlug) where.chain = { slug: chainSlug };

  if (categorySlug) {
    const category = await db.category.findUnique({
      where: { slug: categorySlug },
      include: { children: { select: { id: true } } },
    });
    if (category) {
      const ids = [category.id, ...category.children.map((c) => c.id)];
      where.product = { categoryId: { in: ids } };
    }
  }

  const orderBy: Prisma.OfferOrderByWithRelationInput =
    sort === "newest"
      ? { createdAt: "desc" }
      : sort === "price"
        ? { price: "asc" }
        : sort === "endingSoon"
          ? { validTo: "asc" }
          : { discountPct: { sort: "desc", nulls: "last" } };

  const [items, total] = await Promise.all([
    db.offer.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: OFFER_INCLUDE,
    }),
    db.offer.count({ where }),
  ]);

  return { items, total, page, pageCount: Math.ceil(total / pageSize) };
}

// ─────────────────────────── Products ────────────────────────────────

export const getProductBySlug = cache(async (slug: string) => {
  const product = await db.product.findUnique({
    where: { slug },
    include: { brand: true, category: { include: { parent: true } } },
  });
  if (!product || product.status === "MERGED") return null;

  const [activeOffers, pastOffers, similar] = await Promise.all([
    db.offer.findMany({
      where: { productId: product.id, ...activeOfferWhere() },
      orderBy: { price: "asc" },
      include: { chain: true, leaflet: true },
    }),
    db.priceHistory.findMany({
      where: { productId: product.id },
      orderBy: { recordedAt: "desc" },
      take: 20,
      include: { chain: true },
    }),
    db.offer.findMany({
      where: {
        ...activeOfferWhere(),
        product: {
          categoryId: product.categoryId,
          id: { not: product.id },
        },
      },
      orderBy: { discountPct: { sort: "desc", nulls: "last" } },
      take: 8,
      include: OFFER_INCLUDE,
    }),
  ]);

  return { product, activeOffers, pastOffers, similar };
});

// ─────────────────────────── Leaflets ────────────────────────────────

export async function listLeaflets() {
  return db.leaflet.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ validTo: "desc" }, { publishedAt: "desc" }],
    include: { chain: true, _count: { select: { offers: true } } },
  });
}

export const getLeafletById = cache(async (id: string) => {
  return db.leaflet.findUnique({
    where: { id },
    include: {
      chain: true,
      pages: { orderBy: { pageNumber: "asc" } },
      offers: {
        where: { status: "PUBLISHED" },
        orderBy: { discountPct: { sort: "desc", nulls: "last" } },
        include: OFFER_INCLUDE,
      },
    },
  });
});

// ──────────────────────── Chains & stores ────────────────────────────

export async function listChains() {
  const [chains, offerCounts] = await Promise.all([
    db.chain.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { stores: true } } },
    }),
    db.offer.groupBy({
      by: ["chainId"],
      where: activeOfferWhere(),
      _count: true,
    }),
  ]);
  const counts = new Map(offerCounts.map((c) => [c.chainId, c._count]));
  return chains.map((chain) => ({ ...chain, offerCount: counts.get(chain.id) ?? 0 }));
}

export const getChainBySlug = cache(async (slug: string) => {
  const chain = await db.chain.findUnique({
    where: { slug },
    include: { stores: { orderBy: { city: "asc" } } },
  });
  if (!chain) return null;

  const [leaflets, topOffers, offerCount] = await Promise.all([
    db.leaflet.findMany({
      where: { chainId: chain.id, status: "PUBLISHED", validTo: { gte: new Date() } },
      orderBy: { publishedAt: "desc" },
    }),
    db.offer.findMany({
      where: { chainId: chain.id, ...activeOfferWhere() },
      orderBy: { discountPct: { sort: "desc", nulls: "last" } },
      take: 12,
      include: OFFER_INCLUDE,
    }),
    db.offer.count({ where: { chainId: chain.id, ...activeOfferWhere() } }),
  ]);

  return { chain, leaflets, topOffers, offerCount };
});

// ─────────────────────────── Categories ──────────────────────────────

export async function listCategoryTree() {
  return db.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    include: { children: { orderBy: { sortOrder: "asc" } } },
  });
}

export const getCategoryBySlug = cache(async (slug: string) => {
  return db.category.findUnique({
    where: { slug },
    include: {
      parent: true,
      children: { orderBy: { sortOrder: "asc" } },
    },
  });
});
