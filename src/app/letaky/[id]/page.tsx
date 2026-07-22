import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { getLeafletById } from "@/server/services/catalog";
import { formatShortDate } from "@/lib/format";
import { OfferGrid } from "@/components/catalog/section";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const leaflet = await getLeafletById(id);
  if (!leaflet) return {};
  return {
    title: `${leaflet.title} (${formatShortDate(leaflet.validFrom)} – ${formatShortDate(leaflet.validTo)})`,
    description: `Akciový leták ${leaflet.chain.name} s ${leaflet.offers.length} ponukami.`,
  };
}

export default async function LeafletPage({ params }: { params: Params }) {
  const { id } = await params;
  const leaflet = await getLeafletById(id);
  if (!leaflet || leaflet.status !== "PUBLISHED") notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Domov</Link>
        <ChevronRight className="size-3.5" />
        <Link href="/letaky" className="hover:text-foreground">Letáky</Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/obchody/${leaflet.chain.slug}`} className="hover:text-foreground">
          {leaflet.chain.name}
        </Link>
      </nav>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">{leaflet.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Platí {formatShortDate(leaflet.validFrom)} – {formatShortDate(leaflet.validTo)} ·{" "}
        {leaflet.offers.length} ponúk
      </p>

      {/* Page previews (filled by the AI pipeline in Step 5) */}
      {leaflet.pages.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {leaflet.pages.map((page) => (
            <div
              key={page.id}
              className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border/60"
            >
              <Image
                src={page.imageUrl}
                alt={`Strana ${page.pageNumber}`}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-10 mb-4 text-xl font-bold tracking-tight">Ponuky z letáku</h2>
      {leaflet.offers.length > 0 ? (
        <OfferGrid offers={leaflet.offers} />
      ) : (
        <p className="py-10 text-center text-muted-foreground">
          Ponuky z tohto letáku ešte spracúvame.
        </p>
      )}
    </div>
  );
}
