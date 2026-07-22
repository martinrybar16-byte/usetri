import type { MetadataRoute } from "next";

import { db } from "@/lib/db";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, chains, leaflets] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE", offers: { some: { status: "PUBLISHED" } } },
      select: { slug: true, updatedAt: true },
      take: 5000,
    }),
    db.category.findMany({ select: { slug: true } }),
    db.chain.findMany({ where: { active: true }, select: { slug: true } }),
    db.leaflet.findMany({
      where: { status: "PUBLISHED", validTo: { gte: new Date() } },
      select: { id: true, updatedAt: true },
    }),
  ]);

  return [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/zlavy`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/letaky`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/obchody`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/kategorie`, changeFrequency: "weekly", priority: 0.7 },
    ...chains.map((c) => ({
      url: `${BASE}/obchody/${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...categories.map((c) => ({
      url: `${BASE}/kategorie/${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...leaflets.map((l) => ({
      url: `${BASE}/letaky/${l.id}`,
      lastModified: l.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${BASE}/produkty/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
  ];
}
