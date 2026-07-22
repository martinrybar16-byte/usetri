"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { RatingValue } from "@/generated/prisma/enums";

async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/prihlasenie");
  return session.user;
}

// ─────────────────────────── Lists CRUD ──────────────────────────────

export async function createListAction(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | undefined> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 60) {
    return { error: "Názov musí mať 1 až 60 znakov." };
  }

  const count = await db.shoppingList.count({ where: { userId: user.id } });
  if (count >= 20) return { error: "Môžete mať najviac 20 zoznamov." };

  const list = await db.shoppingList.create({
    data: { userId: user.id, name, isDefault: count === 0 },
  });
  redirect(`/zoznamy/${list.id}`);
}

export async function deleteListAction(listId: string): Promise<void> {
  const user = await requireUser();
  await db.shoppingList.deleteMany({ where: { id: listId, userId: user.id } });
  revalidatePath("/zoznamy");
  redirect("/zoznamy");
}

// ─────────────────────────── List items ──────────────────────────────

const addItemSchema = z.object({
  listId: z.string().min(1),
  productId: z.string().optional(),
  freeText: z.string().trim().max(100).optional(),
  quantity: z.coerce.number().positive().max(999).default(1),
});

export async function addItemAction(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | undefined> {
  const user = await requireUser();

  const parsed = addItemSchema.safeParse({
    listId: formData.get("listId"),
    productId: formData.get("productId") || undefined,
    freeText: formData.get("freeText") || undefined,
    quantity: formData.get("quantity") || 1,
  });
  if (!parsed.success) return { error: "Neplatné údaje." };
  const { listId, productId, freeText, quantity } = parsed.data;

  if (!productId && !freeText) return { error: "Zadajte položku." };

  const list = await db.shoppingList.findFirst({
    where: { id: listId, userId: user.id },
  });
  if (!list) return { error: "Zoznam sa nenašiel." };

  // Resolve free text to a product when there's an exact-ish match
  let resolvedProductId = productId ?? null;
  if (!resolvedProductId && freeText) {
    const product = await db.product.findFirst({
      where: { name: { equals: freeText, mode: "insensitive" }, status: "ACTIVE" },
    });
    resolvedProductId = product?.id ?? null;
  }

  await db.shoppingListItem.create({
    data: {
      listId,
      productId: resolvedProductId,
      freeText: resolvedProductId ? null : freeText,
      quantity,
    },
  });

  revalidatePath(`/zoznamy/${listId}`);
  return undefined;
}

/**
 * Toggling an item "checked" (= purchased) with an active offer also logs a
 * SavingsEntry — that's what feeds the savings dashboard.
 */
export async function toggleItemAction(itemId: string): Promise<void> {
  const user = await requireUser();

  const item = await db.shoppingListItem.findFirst({
    where: { id: itemId, list: { userId: user.id } },
    include: { list: true },
  });
  if (!item) return;

  const nowChecked = !item.checked;
  await db.shoppingListItem.update({
    where: { id: item.id },
    data: { checked: nowChecked },
  });

  if (nowChecked && item.productId) {
    const offer = await db.offer.findFirst({
      where: {
        productId: item.productId,
        status: "PUBLISHED",
        validTo: { gte: new Date() },
        originalPrice: { not: null },
      },
      orderBy: { price: "asc" },
    });
    if (offer?.originalPrice) {
      const qty = Number(item.quantity) || 1;
      const saved = (Number(offer.originalPrice) - Number(offer.price)) * qty;
      if (saved > 0) {
        await db.savingsEntry.create({
          data: {
            userId: user.id,
            offerId: offer.id,
            amountSaved: Math.round(saved * 100) / 100,
            source: "LIST_PURCHASE",
          },
        });
      }
    }
  }

  revalidatePath(`/zoznamy/${item.listId}`);
}

export async function removeItemAction(itemId: string): Promise<void> {
  const user = await requireUser();
  const item = await db.shoppingListItem.findFirst({
    where: { id: itemId, list: { userId: user.id } },
  });
  if (!item) return;
  await db.shoppingListItem.delete({ where: { id: item.id } });
  revalidatePath(`/zoznamy/${item.listId}`);
}

export async function addToListFromProductAction(
  productId: string
): Promise<{ ok: boolean; listName?: string }> {
  const user = await requireUser();

  // Default list (or create one)
  let list = await db.shoppingList.findFirst({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  list ??= await db.shoppingList.create({
    data: { userId: user.id, name: "Môj nákup", isDefault: true },
  });

  const existing = await db.shoppingListItem.findFirst({
    where: { listId: list.id, productId, checked: false },
  });
  if (!existing) {
    await db.shoppingListItem.create({ data: { listId: list.id, productId } });
  }

  revalidatePath(`/zoznamy/${list.id}`);
  return { ok: true, listName: list.name };
}

// ───────────────────────────── Ratings ───────────────────────────────

export async function rateOfferAction(
  offerId: string,
  value: RatingValue
): Promise<{ counts: Record<string, number> } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Musíte byť prihlásený." };

  await db.rating.upsert({
    where: { userId_offerId: { userId: session.user.id, offerId } },
    update: { value },
    create: { userId: session.user.id, offerId, value },
  });

  const grouped = await db.rating.groupBy({
    by: ["value"],
    where: { offerId },
    _count: true,
  });
  const counts = Object.fromEntries(grouped.map((g) => [g.value, g._count]));
  return { counts };
}
