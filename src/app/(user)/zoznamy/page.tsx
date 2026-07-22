import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ListChecks } from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { CreateListForm } from "@/components/lists/create-list-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Nákupné zoznamy" };

export default async function ListsPage() {
  const session = await auth();
  if (!session?.user) redirect("/prihlasenie");

  const lists = await db.shoppingList.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nákupné zoznamy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ušetri porovná celý nákup naprieč obchodmi a poradí, kde nakúpite najlacnejšie.
        </p>
      </div>

      <CreateListForm />

      <div className="grid gap-3 sm:grid-cols-2">
        {lists.map((list) => (
          <Link key={list.id} href={`/zoznamy/${list.id}`} className="group block">
            <Card className="border-border/60 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                  <ListChecks className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{list.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {list._count.items} položiek
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {lists.length === 0 && (
        <p className="rounded-xl border border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
          Vytvorte si prvý zoznam — napríklad „Týždenný nákup".
        </p>
      )}
    </div>
  );
}
