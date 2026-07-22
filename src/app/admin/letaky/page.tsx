import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { formatShortDate } from "@/lib/format";
import { UploadLeafletForm } from "@/components/admin/upload-leaflet-form";
import { ReprocessButton } from "@/components/admin/review-controls";
import { Badge } from "@/components/ui/badge";
import { FormSuccess } from "@/components/auth/form-message";

export const metadata: Metadata = { title: "Letáky — administrácia" };

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  UPLOADED: { label: "Nahraný", variant: "outline" },
  PROCESSING: { label: "Spracúva sa…", variant: "secondary" },
  REVIEW: { label: "Na kontrolu", variant: "default" },
  PUBLISHED: { label: "Zverejnený", variant: "secondary" },
  EXPIRED: { label: "Expirovaný", variant: "outline" },
  ARCHIVED: { label: "Archivovaný", variant: "outline" },
};

export default async function AdminLeafletsPage({
  searchParams,
}: {
  searchParams: Promise<{ nahrane?: string }>;
}) {
  const { nahrane } = await searchParams;

  const [chains, leaflets] = await Promise.all([
    db.chain.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.leaflet.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        chain: true,
        extractionJobs: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { offers: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Letáky</h1>

      {nahrane === "1" && (
        <FormSuccess message="Leták bol nahraný — AI spracovanie beží na pozadí. Stav sa aktualizuje po obnovení stránky." />
      )}

      <UploadLeafletForm chains={chains} />

      <div className="divide-y divide-border/60 rounded-xl border border-border/60">
        {leaflets.map((leaflet) => {
          const status = STATUS_LABEL[leaflet.status] ?? STATUS_LABEL.UPLOADED;
          const job = leaflet.extractionJobs[0];
          return (
            <div key={leaflet.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {leaflet.chain.name} — {leaflet.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatShortDate(leaflet.validFrom)} – {formatShortDate(leaflet.validTo)}
                  {leaflet.pageCount > 0 && ` · ${leaflet.pageCount} strán`}
                  {leaflet._count.offers > 0 && ` · ${leaflet._count.offers} ponúk`}
                  {job?.status === "RUNNING" && ` · strana ${job.pagesDone}/${leaflet.pageCount || "?"}`}
                  {job?.status === "FAILED" && ` · chyba: ${job.error}`}
                </p>
              </div>
              <Badge variant={status.variant}>{status.label}</Badge>
              {leaflet.status === "REVIEW" && (
                <Link
                  href={`/admin/kontrola?letak=${leaflet.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Skontrolovať →
                </Link>
              )}
              {(leaflet.status === "UPLOADED" || job?.status === "FAILED") &&
                leaflet.pdfUrl && <ReprocessButton leafletId={leaflet.id} />}
            </div>
          );
        })}
        {leaflets.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Zatiaľ žiadne letáky — nahrajte prvý vyššie.
          </p>
        )}
      </div>
    </div>
  );
}
