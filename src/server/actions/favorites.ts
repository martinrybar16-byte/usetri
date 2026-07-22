"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { normalizeQuery } from "@/server/services/search";
import type { FavoriteType } from "@/generated/prisma/enums";

const entitySchema = z.object({
  entityType: z.enum(["PRODUCT", "BRAND", "CATEGORY", "CHAIN"]),
  entityId: z.string().min(1),
});

export async function toggleFavoriteAction(
  entityType: FavoriteType,
  entityId: string
): Promise<{ favorited: boolean } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Musíte byť prihlásený." };

  const parsed = entitySchema.safeParse({ entityType, entityId });
  if (!parsed.success) return { error: "Neplatné údaje." };

  const key = {
    userId_entityType_entityId: {
      userId: session.user.id,
      entityType,
      entityId,
    },
  };

  const existing = await db.favorite.findUnique({ where: key });
  if (existing) {
    await db.favorite.delete({ where: key });
  } else {
    await db.favorite.create({
      data: { userId: session.user.id, entityType, entityId },
    });
  }

  revalidatePath("/oblubene");
  return { favorited: !existing };
}

export async function addWatchedTermAction(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | undefined> {
  const session = await auth();
  if (!session?.user) return { error: "Musíte byť prihlásený." };

  const term = String(formData.get("term") ?? "").trim();
  if (term.length < 2 || term.length > 60) {
    return { error: "Výraz musí mať 2 až 60 znakov." };
  }

  const count = await db.watchedTerm.count({ where: { userId: session.user.id } });
  if (count >= 30) return { error: "Môžete sledovať najviac 30 výrazov." };

  await db.watchedTerm.upsert({
    where: {
      userId_normalizedTerm: {
        userId: session.user.id,
        normalizedTerm: normalizeQuery(term),
      },
    },
    update: {},
    create: {
      userId: session.user.id,
      term,
      normalizedTerm: normalizeQuery(term),
    },
  });

  revalidatePath("/oblubene");
  return undefined;
}

export async function removeWatchedTermAction(termId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  await db.watchedTerm.deleteMany({
    where: { id: termId, userId: session.user.id },
  });
  revalidatePath("/oblubene");
}

const settingsSchema = z.object({
  frequency: z.enum(["INSTANT", "DAILY", "WEEKLY"]),
  minDiscountPct: z.coerce.number().int().min(0).max(90).optional(),
  onFavoriteProduct: z.coerce.boolean(),
  onFavoriteBrand: z.coerce.boolean(),
  onNewLeaflet: z.coerce.boolean(),
  onPriceDrop: z.coerce.boolean(),
  onListCheaper: z.coerce.boolean(),
});

export async function updateNotificationSettingsAction(
  _prev: { error?: string; success?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Musíte byť prihlásený." };

  const parsed = settingsSchema.safeParse({
    frequency: formData.get("frequency"),
    minDiscountPct: formData.get("minDiscountPct") || undefined,
    onFavoriteProduct: formData.get("onFavoriteProduct") === "on",
    onFavoriteBrand: formData.get("onFavoriteBrand") === "on",
    onNewLeaflet: formData.get("onNewLeaflet") === "on",
    onPriceDrop: formData.get("onPriceDrop") === "on",
    onListCheaper: formData.get("onListCheaper") === "on",
  });
  if (!parsed.success) return { error: "Neplatné nastavenia." };

  const { minDiscountPct, ...rest } = parsed.data;
  await db.notificationSettings.upsert({
    where: { userId: session.user.id },
    update: { ...rest, minDiscountPct: minDiscountPct || null },
    create: { userId: session.user.id, ...rest, minDiscountPct: minDiscountPct || null },
  });

  return { success: "Nastavenia upozornení boli uložené." };
}
