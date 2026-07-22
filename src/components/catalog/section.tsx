import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { OfferWithProduct } from "@/server/services/catalog";
import { OfferCard } from "@/components/catalog/offer-card";

export function SectionHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {linkLabel}
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

export function OfferGrid({ offers }: { offers: OfferWithProduct[] }) {
  if (offers.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} />
      ))}
    </div>
  );
}

export function OfferSection({
  title,
  href,
  linkLabel,
  offers,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  offers: OfferWithProduct[];
}) {
  if (offers.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <SectionHeader title={title} href={href} linkLabel={linkLabel} />
      <OfferGrid offers={offers} />
    </section>
  );
}
