import "server-only";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { normalizeQuery } from "@/server/services/search";
import type { ExtractedItemRaw } from "@/server/services/extraction/schema";

/**
 * Matches an extracted item against the canonical product catalog.
 * ≥ 0.85 → auto-match · 0.55–0.85 → suggested match (admin confirms)
 * < 0.55 → no match (a new draft product is created on approval)
 */

export type MatchResult = {
  productId: string | null;
  confidence: number;
};

export async function matchProduct(item: ExtractedItemRaw): Promise<MatchResult> {
  const fullName = item.brand && !item.name.toLowerCase().includes(item.brand.toLowerCase())
    ? `${item.brand} ${item.name}`
    : item.name;
  const normalized = normalizeQuery(fullName);
  if (normalized.length < 3) return { productId: null, confidence: 0 };

  const candidates = await db.$queryRaw<
    { id: string; sim: number; unitSize: string | null }[]
  >(Prisma.sql`
    SELECT id, "unitSize",
      extensions.similarity("normalizedName", ${normalized})::float AS sim
    FROM "Product"
    WHERE status = 'ACTIVE'
      AND extensions.similarity("normalizedName", ${normalized}) > 0.4
    ORDER BY sim DESC
    LIMIT 3
  `);

  if (candidates.length === 0) return { productId: null, confidence: 0 };

  const best = candidates[0];
  let confidence = best.sim;

  // Unit size agreement nudges confidence up/down
  if (item.unit_size && best.unitSize) {
    const a = normalizeQuery(item.unit_size).replace(/\s/g, "");
    const b = normalizeQuery(best.unitSize).replace(/\s/g, "");
    confidence += a === b ? 0.1 : -0.15;
  }

  confidence = Math.max(0, Math.min(1, confidence));
  return confidence >= 0.55
    ? { productId: best.id, confidence }
    : { productId: null, confidence: 0 };
}
