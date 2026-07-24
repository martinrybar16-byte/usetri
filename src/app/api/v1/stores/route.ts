import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

/**
 * Stores within a map viewport (bounding box). The map fetches only what's
 * visible instead of shipping all ~2.7k stores to every visitor.
 *
 * GET /api/v1/stores?minLat=&maxLat=&minLng=&maxLng=&chain=slug&limit=
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const num = (key: string) => {
    const v = Number(sp.get(key));
    return Number.isFinite(v) ? v : null;
  };

  const minLat = num("minLat");
  const maxLat = num("maxLat");
  const minLng = num("minLng");
  const maxLng = num("maxLng");
  const chain = sp.get("chain");
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 400, 1), 800);

  const where: Prisma.StoreWhereInput = {};
  if (minLat != null && maxLat != null && minLng != null && maxLng != null) {
    where.lat = { gte: Math.min(minLat, maxLat), lte: Math.max(minLat, maxLat) };
    where.lng = { gte: Math.min(minLng, maxLng), lte: Math.max(minLng, maxLng) };
  }
  if (chain) where.chain = { slug: chain };

  const stores = await db.store.findMany({
    where,
    take: limit,
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      lat: true,
      lng: true,
      chain: { select: { name: true, slug: true, color: true } },
    },
  });

  return NextResponse.json(
    {
      stores: stores.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        city: s.city,
        lat: s.lat,
        lng: s.lng,
        chainName: s.chain.name,
        chainSlug: s.chain.slug,
        color: s.chain.color,
      })),
      truncated: stores.length === limit,
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } }
  );
}
