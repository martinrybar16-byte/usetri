import type { Metadata } from "next";
import Link from "next/link";

import { listCategoryTree } from "@/server/services/catalog";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Kategórie produktov",
  description:
    "Zľavy podľa kategórií: mliečne výrobky, mäso, nápoje, drogéria a ďalšie kategórie v slovenských supermarketoch.",
};

export default async function CategoriesPage() {
  const categories = await listCategoryTree();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Kategórie</h1>
      <p className="mt-1 text-sm text-muted-foreground">Zľavy podľa kategórií produktov</p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {categories.map((category) => (
          <Link key={category.id} href={`/kategorie/${category.slug}`} className="group block">
            <Card className="h-full border-border/60 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardContent className="py-6">
                <span className="text-3xl">{category.icon}</span>
                <p className="mt-3 font-semibold">{category.name}</p>
                {category.children.length > 0 && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {category.children.map((c) => c.name).join(" · ")}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
