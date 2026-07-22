import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import {
  BulkApproveButton,
  ItemReviewCard,
  PublishButton,
} from "@/components/admin/review-controls";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Kontrola AI — administrácia" };

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ letak?: string }>;
}) {
  const { letak } = await searchParams;

  const reviewLeaflets = await db.leaflet.findMany({
    where: { status: { in: ["REVIEW", "PUBLISHED"] } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      chain: true,
      extractionJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          _count: { select: { items: true } },
        },
      },
    },
  });

  const selected =
    reviewLeaflets.find((l) => l.id === letak) ??
    reviewLeaflets.find((l) => l.status === "REVIEW");

  const job = selected?.extractionJobs[0];

  const items = job
    ? await db.extractedItem.findMany({
        where: { jobId: job.id, reviewStatus: "PENDING" },
        orderBy: { extractionConfidence: "asc" },
        include: { matchedProduct: { select: { name: true } } },
      })
    : [];

  const pendingCounts = new Map<string, number>();
  for (const leaflet of reviewLeaflets) {
    const j = leaflet.extractionJobs[0];
    if (j) {
      pendingCounts.set(
        leaflet.id,
        await db.extractedItem.count({ where: { jobId: j.id, reviewStatus: "PENDING" } })
      );
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Kontrola AI</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Položky s najnižšou istotou sú prvé. Schválené položky sa zverejnia tlačidlom „Zverejniť".
      </p>

      {/* Leaflet selector */}
      <div className="mt-5 flex flex-wrap gap-2">
        {reviewLeaflets.map((leaflet) => (
          <Link key={leaflet.id} href={`/admin/kontrola?letak=${leaflet.id}`}>
            <Badge
              variant={selected?.id === leaflet.id ? "default" : "outline"}
              className="cursor-pointer px-3 py-1"
            >
              {leaflet.chain.name}
              {(pendingCounts.get(leaflet.id) ?? 0) > 0 &&
                ` · ${pendingCounts.get(leaflet.id)} čaká`}
              {leaflet.status === "PUBLISHED" && " · zverejnený"}
            </Badge>
          </Link>
        ))}
        {reviewLeaflets.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nič na kontrolu — nahrajte leták v sekcii Letáky.
          </p>
        )}
      </div>

      {selected && job && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <BulkApproveButton jobId={job.id} />
            <PublishButton leafletId={selected.id} />
            <span className="text-sm text-muted-foreground">
              {items.length} položiek čaká · model {job.model}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {items.map((item) => (
              <ItemReviewCard
                key={item.id}
                itemId={item.id}
                raw={item.raw as never}
                matchedProductName={item.matchedProduct?.name ?? null}
                matchConfidence={item.matchConfidence}
              />
            ))}
            {items.length === 0 && (
              <p className="rounded-xl border border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                Všetko skontrolované — môžete zverejniť schválené položky.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
