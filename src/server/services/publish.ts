import "server-only";

import { db } from "@/lib/db";
import { normalizeQuery } from "@/server/services/search";
import { extractedItemSchema } from "@/server/services/extraction/schema";
import type { ExtractedItem, Leaflet } from "@/generated/prisma/client";

function slugify(text: string): string {
  return normalizeQuery(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90);
}

/**
 * Turns one APPROVED/EDITED staged item into a real offer:
 * matched product is reused, otherwise a product is created.
 * Also appends price history. Idempotent per (product, chain, validFrom).
 */
export async function publishExtractedItem(
  item: ExtractedItem,
  leaflet: Leaflet & { chain: { id: string } }
): Promise<{ offerId: string } | { skipped: string }> {
  const parsed = extractedItemSchema.safeParse(item.raw);
  if (!parsed.success) return { skipped: "invalid raw payload" };
  const raw = parsed.data;

  const fullName =
    raw.brand && !raw.name.toLowerCase().includes(raw.brand.toLowerCase())
      ? `${raw.brand} ${raw.name}`
      : raw.name;

  let productId = item.matchedProductId;

  if (!productId) {
    const slugBase = slugify(`${fullName} ${raw.unit_size ?? ""}`);
    const brand = raw.brand
      ? await db.brand.upsert({
          where: { slug: slugify(raw.brand) },
          update: {},
          create: { slug: slugify(raw.brand), name: raw.brand },
        })
      : null;
    const category = raw.category_guess
      ? await db.category.findUnique({ where: { slug: raw.category_guess } })
      : null;

    // Slug collision → suffix
    let slug = slugBase;
    for (let i = 2; await db.product.findUnique({ where: { slug } }); i++) {
      slug = `${slugBase}-${i}`;
    }

    const product = await db.product.create({
      data: {
        slug,
        name: fullName,
        normalizedName: normalizeQuery(fullName),
        brandId: brand?.id,
        categoryId: category?.id,
        countryId: leaflet.countryId,
        unitSize: raw.unit_size ?? undefined,
        attributes: raw.flags ?? undefined,
        status: "ACTIVE",
      },
    });
    productId = product.id;
  }

  // Idempotency: one offer per product+chain+validity window
  const existing = await db.offer.findFirst({
    where: { productId, chainId: leaflet.chainId, validFrom: leaflet.validFrom },
  });
  if (existing) return { offerId: existing.id };

  const discountPct =
    raw.discount_pct ??
    (raw.original_price
      ? Math.round((1 - raw.price / raw.original_price) * 100)
      : null);

  const imageUrl =
    typeof (item.raw as Record<string, unknown>)._cropUrl === "string"
      ? ((item.raw as Record<string, unknown>)._cropUrl as string)
      : null;

  const offer = await db.offer.create({
    data: {
      productId,
      chainId: leaflet.chainId,
      leafletId: leaflet.id,
      leafletPageId: item.leafletPageId,
      price: raw.price,
      originalPrice: raw.original_price ?? undefined,
      discountPct,
      validFrom: leaflet.validFrom,
      validTo: leaflet.validTo,
      imageUrl,
      cropBbox: raw.bbox ?? undefined,
      conditions: raw.conditions ?? undefined,
      source: "AI",
      aiConfidence: item.extractionConfidence,
      status: "PUBLISHED",
    },
  });

  await db.priceHistory.create({
    data: {
      productId,
      chainId: leaflet.chainId,
      offerId: offer.id,
      price: raw.price,
      originalPrice: raw.original_price ?? undefined,
      discountPct,
    },
  });

  // Product without an image inherits the leaflet crop
  if (imageUrl) {
    await db.product.updateMany({
      where: { id: productId, imageUrl: null },
      data: { imageUrl },
    });
  }

  return { offerId: offer.id };
}
