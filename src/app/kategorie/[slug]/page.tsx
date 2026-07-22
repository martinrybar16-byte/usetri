import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { getCategoryBySlug, listOffers } from "@/server/services/catalog";
import { OfferGrid } from "@/components/catalog/section";
import { Badge } from "@/components/ui/badge";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: `${category.name} v akcii`,
    description: `Aktuálne zľavy v kategórii ${category.name} vo všetkých slovenských supermarketoch.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ strana?: string }>;
}) {
  const { slug } = await params;
  const { strana } = await searchParams;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const page = Math.max(1, Number(strana) || 1);
  const { items, total, pageCount } = await listOffers({ categorySlug: slug, page });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Domov</Link>
        <ChevronRight className="size-3.5" />
        <Link href="/kategorie" className="hover:text-foreground">Kategórie</Link>
        {category.parent && (
          <>
            <ChevronRight className="size-3.5" />
            <Link href={`/kategorie/${category.parent.slug}`} className="hover:text-foreground">
              {category.parent.name}
            </Link>
          </>
        )}
      </nav>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">
        {category.icon} {category.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{total} akciových ponúk</p>

      {category.children.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <Link key={child.id} href={`/kategorie/${child.slug}`}>
              <Badge variant="secondary" className="cursor-pointer px-3 py-1 font-normal">
                {child.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8">
        {items.length > 0 ? (
          <OfferGrid offers={items} />
        ) : (
          <p className="py-16 text-center text-muted-foreground">
            V tejto kategórii momentálne nie sú žiadne akcie.
          </p>
        )}
      </div>

      {pageCount > 1 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Strana {page} z {pageCount} —{" "}
          {page < pageCount && (
            <Link href={`/kategorie/${slug}?strana=${page + 1}`} className="underline">
              ďalšia strana
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
