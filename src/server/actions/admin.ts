"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { inngest } from "@/inngest/client";
import { uploadFile, isStorageConfigured } from "@/lib/storage";
import { requireAdmin } from "@/server/auth/guards";
import { publishExtractedItem } from "@/server/services/publish";
import { extractedItemSchema } from "@/server/services/extraction/schema";

export type AdminActionState = { error?: string; success?: string } | undefined;

// ───────────────────────── Leaflet upload ────────────────────────────

const uploadSchema = z.object({
  chainId: z.string().min(1, { error: "Vyberte obchod." }),
  title: z.string().trim().min(3, { error: "Zadajte názov letáku." }),
  validFrom: z.string().min(1, { error: "Zadajte začiatok platnosti." }),
  validTo: z.string().min(1, { error: "Zadajte koniec platnosti." }),
});

export async function uploadLeafletAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const user = await requireAdmin();

  if (!isStorageConfigured()) {
    return {
      error:
        "Úložisko nie je nastavené — doplňte SUPABASE_SERVICE_ROLE_KEY do .env a reštartujte server.",
    };
  }

  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Vyberte PDF súbor letáku." };
  }
  if (file.type !== "application/pdf") return { error: "Súbor musí byť PDF." };
  if (file.size > 50 * 1024 * 1024) return { error: "PDF je príliš veľké (max 50 MB)." };

  const parsed = uploadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  const { chainId, title, validFrom, validTo } = parsed.data;

  const chain = await db.chain.findUnique({ where: { id: chainId } });
  if (!chain) return { error: "Neznámy obchod." };
  const country = await db.country.findUniqueOrThrow({ where: { code: "SK" } });

  const leaflet = await db.leaflet.create({
    data: {
      chainId,
      countryId: country.id,
      title,
      pdfUrl: "",
      validFrom: new Date(validFrom),
      validTo: new Date(`${validTo}T23:59:59`),
      status: "UPLOADED",
      uploadedById: user.id,
    },
  });

  const pdfUrl = await uploadFile(
    `leaflets/${leaflet.id}/original.pdf`,
    Buffer.from(await file.arrayBuffer()),
    "application/pdf"
  );
  await db.leaflet.update({ where: { id: leaflet.id }, data: { pdfUrl } });

  await inngest.send({ name: "leaflet/uploaded", data: { leafletId: leaflet.id } });

  revalidatePath("/admin/letaky");
  redirect(`/admin/letaky?nahrane=1`);
}

export async function reprocessLeafletAction(leafletId: string): Promise<void> {
  await requireAdmin();
  // Old staged items are dropped; offers already published stay untouched.
  await db.extractionJob.deleteMany({ where: { leafletId } });
  await inngest.send({ name: "leaflet/uploaded", data: { leafletId } });
  revalidatePath("/admin/letaky");
}

// ─────────────────────────── Review queue ────────────────────────────

export async function reviewItemAction(
  itemId: string,
  decision: "APPROVED" | "REJECTED",
  edited?: { name?: string; brand?: string; price?: number; original_price?: number | null; unit_size?: string; category_guess?: string }
): Promise<void> {
  const user = await requireAdmin();

  const item = await db.extractedItem.findUniqueOrThrow({ where: { id: itemId } });

  let raw = item.raw as Record<string, unknown>;
  let status: "APPROVED" | "REJECTED" | "EDITED" = decision;

  if (decision === "APPROVED" && edited) {
    const merged = { ...raw, ...Object.fromEntries(Object.entries(edited).filter(([, v]) => v !== undefined)) };
    const check = extractedItemSchema.safeParse(merged);
    if (check.success) {
      raw = { ...merged };
      status = "EDITED";
    }
  }

  await db.extractedItem.update({
    where: { id: itemId },
    data: {
      raw: raw as object,
      reviewStatus: status,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });
  revalidatePath("/admin/kontrola");
}

export async function bulkApproveAction(
  jobId: string,
  minConfidence: number
): Promise<{ approved: number }> {
  const user = await requireAdmin();
  const result = await db.extractedItem.updateMany({
    where: {
      jobId,
      reviewStatus: "PENDING",
      extractionConfidence: { gte: minConfidence },
    },
    data: {
      reviewStatus: "APPROVED",
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });
  revalidatePath("/admin/kontrola");
  return { approved: result.count };
}

// ───────────────────────────── Publish ───────────────────────────────

export async function publishLeafletAction(leafletId: string): Promise<AdminActionState> {
  await requireAdmin();

  const leaflet = await db.leaflet.findUniqueOrThrow({
    where: { id: leafletId },
    include: { chain: true },
  });

  const items = await db.extractedItem.findMany({
    where: {
      job: { leafletId },
      reviewStatus: { in: ["APPROVED", "EDITED"] },
    },
  });
  if (items.length === 0) {
    return { error: "Žiadne schválené položky na zverejnenie." };
  }

  const offerIds: string[] = [];
  for (const item of items) {
    const result = await publishExtractedItem(item, leaflet);
    if ("offerId" in result) offerIds.push(result.offerId);
  }

  await db.leaflet.update({
    where: { id: leafletId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  await inngest.send({
    name: "offers/published",
    data: { leafletId, offerIds },
  });

  revalidatePath("/admin/kontrola");
  revalidatePath("/admin/letaky");
  revalidatePath("/");
  return { success: `Zverejnených ${offerIds.length} ponúk.` };
}
