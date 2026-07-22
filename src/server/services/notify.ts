import "server-only";
import { createHmac } from "crypto";

import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { sendEmail } from "@/server/services/email";
import {
  dealsEmailTemplate,
  type OfferEmailItem,
} from "@/emails/notification-templates";

/**
 * Notification fan-out (ARCHITECTURE.md §7).
 * fanOutOffers: called after a leaflet publish — matches new offers against
 * favorites + watched terms, creates Notification rows, and immediately
 * emails users with frequency INSTANT. Digest crons pick up the rest.
 */

const REASON_LABEL: Record<string, string> = {
  favorite_product_sale: "sledovaný produkt",
  favorite_brand_sale: "obľúbená značka",
  favorite_category_sale: "obľúbená kategória",
  favorite_chain_leaflet: "obľúbený obchod",
  watched_term_sale: "sledovaný výraz",
};

// ─────────────────────── Unsubscribe tokens ──────────────────────────

export function unsubscribeToken(userId: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "dev")
    .update(`unsub:${userId}`)
    .digest("base64url");
}

export function unsubscribeUrl(userId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/odhlasit/${userId}.${unsubscribeToken(userId)}`;
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  return unsubscribeToken(userId) === token;
}

// ───────────────────────────── Fan-out ───────────────────────────────

export async function fanOutOffers(offerIds: string[]): Promise<{
  notifications: number;
  instantEmails: number;
}> {
  if (offerIds.length === 0) return { notifications: 0, instantEmails: 0 };

  const offers = await db.offer.findMany({
    where: { id: { in: offerIds }, status: "PUBLISHED" },
    include: {
      product: { include: { brand: true, category: true } },
      chain: true,
    },
  });
  if (offers.length === 0) return { notifications: 0, instantEmails: 0 };

  const chainId = offers[0].chainId;

  // All users with any personalization + their settings
  const users = await db.user.findMany({
    where: {
      emailVerifiedAt: { not: null },
      OR: [{ favorites: { some: {} } }, { watchedTerms: { some: {} } }],
    },
    include: { favorites: true, watchedTerms: true, notificationSettings: true },
  });

  let notificationCount = 0;
  let instantEmails = 0;

  for (const user of users) {
    const settings = user.notificationSettings;
    if (!settings) continue;

    const favProducts = new Set(
      user.favorites.filter((f) => f.entityType === "PRODUCT").map((f) => f.entityId)
    );
    const favBrands = new Set(
      user.favorites.filter((f) => f.entityType === "BRAND").map((f) => f.entityId)
    );
    const favCategories = new Set(
      user.favorites.filter((f) => f.entityType === "CATEGORY").map((f) => f.entityId)
    );
    const favChains = new Set(
      user.favorites.filter((f) => f.entityType === "CHAIN").map((f) => f.entityId)
    );

    const matches: { offer: (typeof offers)[number]; type: string }[] = [];

    for (const offer of offers) {
      if (settings.minDiscountPct && (offer.discountPct ?? 0) < settings.minDiscountPct) {
        continue;
      }
      if (settings.onFavoriteProduct && favProducts.has(offer.productId)) {
        matches.push({ offer, type: "favorite_product_sale" });
        continue;
      }
      if (settings.onFavoriteBrand && offer.product.brandId && favBrands.has(offer.product.brandId)) {
        matches.push({ offer, type: "favorite_brand_sale" });
        continue;
      }
      if (offer.product.categoryId && favCategories.has(offer.product.categoryId)) {
        matches.push({ offer, type: "favorite_category_sale" });
        continue;
      }
      const watched = user.watchedTerms.find((t) =>
        offer.product.normalizedName.includes(t.normalizedTerm)
      );
      if (watched) {
        matches.push({ offer, type: "watched_term_sale" });
      }
    }

    // "New leaflet from favorite chain" — one notification, not per offer
    if (settings.onNewLeaflet && favChains.has(chainId)) {
      matches.push({ offer: offers[0], type: "favorite_chain_leaflet" });
    }

    if (matches.length === 0) continue;

    await db.notification.createMany({
      data: matches.map((m) => ({
        userId: user.id,
        type: m.type,
        payload: {
          offerId: m.offer.id,
          productName: m.offer.product.name,
          productSlug: m.offer.product.slug,
          chainName: m.offer.chain.name,
          price: String(m.offer.price),
          originalPrice: m.offer.originalPrice ? String(m.offer.originalPrice) : null,
          discountPct: m.offer.discountPct,
        },
      })),
    });
    notificationCount += matches.length;

    if (settings.frequency === "INSTANT") {
      const sent = await emailUnsentNotifications(
        user.id,
        user.email,
        "Nové zľavy na vaše obľúbené produkty",
        "Práve vyšli nové akcie, ktoré zodpovedajú vašim preferenciám:"
      );
      if (sent > 0) instantEmails++;
    }
  }

  return { notifications: notificationCount, instantEmails };
}

// ───────────────────────────── Digests ───────────────────────────────

/** Sends one email with all not-yet-emailed notifications. Returns item count. */
export async function emailUnsentNotifications(
  userId: string,
  email: string,
  heading: string,
  intro: string
): Promise<number> {
  const pending = await db.notification.findMany({
    where: { userId, emailedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  if (pending.length === 0) return 0;

  const items: OfferEmailItem[] = pending.map((n) => {
    const p = n.payload as Record<string, unknown>;
    return {
      productName: String(p.productName ?? ""),
      productSlug: String(p.productSlug ?? ""),
      chainName: String(p.chainName ?? ""),
      price: formatPrice(Number(p.price ?? 0)),
      originalPrice: p.originalPrice ? formatPrice(Number(p.originalPrice)) : null,
      discountPct: (p.discountPct as number | null) ?? null,
      reason: REASON_LABEL[n.type] ?? "upozornenie",
    };
  });

  const ok = await sendEmail({
    to: email,
    subject: heading,
    html: dealsEmailTemplate({
      heading,
      intro,
      items,
      unsubscribeUrl: unsubscribeUrl(userId),
    }),
    type: "deal_notification",
    userId,
  });

  if (ok) {
    await db.notification.updateMany({
      where: { id: { in: pending.map((n) => n.id) } },
      data: { emailedAt: new Date() },
    });
  }
  return pending.length;
}

/** Digest run for all users on the given frequency. Returns emails sent. */
export async function runDigest(frequency: "DAILY" | "WEEKLY"): Promise<number> {
  const users = await db.user.findMany({
    where: {
      emailVerifiedAt: { not: null },
      notificationSettings: { frequency },
      notifications: { some: { emailedAt: null } },
    },
    select: { id: true, email: true },
  });

  let sent = 0;
  for (const user of users) {
    const count = await emailUnsentNotifications(
      user.id,
      user.email,
      frequency === "DAILY" ? "Váš denný prehľad zliav" : "Váš týždenný prehľad zliav",
      "Súhrn nových akcií podľa vašich preferencií:"
    );
    if (count > 0) sent++;
  }
  return sent;
}
