import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin } from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getChainBySlug } from "@/server/services/catalog";
import { OfferGrid, SectionHeader } from "@/components/catalog/section";
import { LeafletCard } from "@/components/catalog/leaflet-card";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { Button } from "@/components/ui/button";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getChainBySlug(slug);
  if (!data) return {};
  return {
    title: `${data.chain.name} — aktuálny leták a zľavy`,
    description: `Aktuálne akcie, letáky a predajne ${data.chain.name} na Slovensku. ${data.offerCount} aktívnych zliav.`,
  };
}

export default async function ChainPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getChainBySlug(slug);
  if (!data) notFound();

  const { chain, leaflets, topOffers, offerCount } = data;

  const session = await auth();
  const favorited = session?.user
    ? Boolean(
        await db.favorite.findUnique({
          where: {
            userId_entityType_entityId: {
              userId: session.user.id,
              entityType: "CHAIN",
              entityId: chain.id,
            },
          },
        })
      )
    : false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Domov</Link>
        <ChevronRight className="size-3.5" />
        <Link href="/obchody" className="hover:text-foreground">Obchody</Link>
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div
          className="flex size-16 items-center justify-center rounded-2xl text-2xl font-bold"
          style={{
            backgroundColor: `${chain.color ?? "#666"}18`,
            color: chain.color ?? undefined,
          }}
        >
          {chain.name.slice(0, 1)}
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{chain.name}</h1>
          <p className="text-sm text-muted-foreground">
            {offerCount} aktívnych zliav
            {chain.stores.length > 0 ? ` · ${chain.stores.length} predajní` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FavoriteButton
            entityType="CHAIN"
            entityId={chain.id}
            initialFavorited={favorited}
            isLoggedIn={Boolean(session?.user)}
            label="Sledovať obchod"
          />
          {chain.website && (
            <Button asChild variant="outline" size="sm">
              <a href={chain.website} target="_blank" rel="noopener noreferrer">
                Web obchodu ↗
              </a>
            </Button>
          )}
        </div>
      </div>

      {leaflets.length > 0 && (
        <section className="mt-10">
          <SectionHeader title="Aktuálne letáky" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {leaflets.map((leaflet) => (
              <LeafletCard key={leaflet.id} leaflet={{ ...leaflet, chain }} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <SectionHeader
          title="Najlepšie zľavy"
          href={`/zlavy?obchod=${chain.slug}`}
          linkLabel="Všetky zľavy"
        />
        {topOffers.length > 0 ? (
          <OfferGrid offers={topOffers} />
        ) : (
          <p className="py-10 text-center text-muted-foreground">
            Zľavy tohto obchodu už čoskoro.
          </p>
        )}
      </section>

      {chain.stores.length > 0 && (
        <section className="mt-10">
          <SectionHeader title="Predajne" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chain.stores.map((store) => (
              <div
                key={store.id}
                className="flex items-start gap-3 rounded-xl border border-border/60 p-4"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{store.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {store.address}, {store.city}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
