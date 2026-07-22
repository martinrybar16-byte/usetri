import type { Metadata } from "next";

import { listLeaflets } from "@/server/services/catalog";
import { LeafletCard } from "@/components/catalog/leaflet-card";

export const metadata: Metadata = {
  title: "Aktuálne akciové letáky",
  description:
    "Najnovšie akciové letáky slovenských supermarketov — Tesco, Lidl, Kaufland, Billa, COOP Jednota a ďalšie.",
};

export default async function LeafletsPage() {
  const leaflets = await listLeaflets();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Akciové letáky</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Aktuálne letáky všetkých sledovaných reťazcov
      </p>

      {leaflets.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {leaflets.map((leaflet) => (
            <LeafletCard
              key={leaflet.id}
              leaflet={leaflet}
              offerCount={leaflet._count.offers}
            />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-muted-foreground">
          Momentálne tu nie sú žiadne letáky.
        </p>
      )}
    </div>
  );
}
