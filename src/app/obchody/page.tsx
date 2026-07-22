import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";

import { db } from "@/lib/db";
import { listChains } from "@/server/services/catalog";
import { StoresMap } from "@/components/map/stores-map";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Supermarkety a obchody",
  description:
    "Prehľad slovenských obchodných reťazcov: aktuálne letáky, zľavy a predajne Tesco, Lidl, Kaufland, Billa a ďalších.",
};

export default async function ChainsPage() {
  const [chains, stores] = await Promise.all([
    listChains(),
    db.store.findMany({ include: { chain: true } }),
  ]);

  const mapStores = stores.map((store) => ({
    id: store.id,
    name: store.name,
    address: store.address,
    city: store.city,
    lat: store.lat,
    lng: store.lng,
    chainName: store.chain.name,
    chainSlug: store.chain.slug,
    color: store.chain.color,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Obchody</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sledované obchodné reťazce na Slovensku
      </p>

      {mapStores.length > 0 && (
        <div className="mt-6">
          <StoresMap stores={mapStores} />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Povoľte polohu a mapa sa priblíži na predajne vo vašom okolí.
          </p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {chains.map((chain) => (
          <Link key={chain.id} href={`/obchody/${chain.slug}`} className="group block">
            <Card className="h-full border-border/60 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${chain.color ?? "#666"}18` }}
                >
                  <Store className="size-7" style={{ color: chain.color ?? undefined }} />
                </div>
                <div>
                  <p className="font-semibold">{chain.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {chain.offerCount > 0
                      ? `${chain.offerCount} aktívnych zliav`
                      : "Zľavy už čoskoro"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
