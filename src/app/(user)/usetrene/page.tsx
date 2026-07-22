import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PiggyBank, Receipt, TrendingUp } from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Ušetrené" };

export default async function SavingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/prihlasenie");
  const userId = session.user.id;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [total, thisMonth, thisYear, dealsUsed, recent] = await Promise.all([
    db.savingsEntry.aggregate({ where: { userId }, _sum: { amountSaved: true } }),
    db.savingsEntry.aggregate({
      where: { userId, createdAt: { gte: monthStart } },
      _sum: { amountSaved: true },
    }),
    db.savingsEntry.aggregate({
      where: { userId, createdAt: { gte: yearStart } },
      _sum: { amountSaved: true },
    }),
    db.savingsEntry.count({ where: { userId } }),
    db.savingsEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        // offer relation is optional; go through offerId manually
      },
    }),
  ]);

  const offerIds = recent.map((r) => r.offerId).filter((id): id is string => !!id);
  const offers = offerIds.length
    ? await db.offer.findMany({
        where: { id: { in: offerIds } },
        include: { product: true, chain: true },
      })
    : [];
  const offerById = new Map(offers.map((o) => [o.id, o]));

  const monthSaved = Number(thisMonth._sum.amountSaved ?? 0);
  const yearlyEstimate = monthSaved > 0 ? monthSaved * 12 : null;

  const stats = [
    {
      icon: PiggyBank,
      label: "Celkovo ušetrené",
      value: formatPrice(Number(total._sum.amountSaved ?? 0)),
    },
    {
      icon: Receipt,
      label: "Tento mesiac",
      value: formatPrice(monthSaved),
    },
    {
      icon: TrendingUp,
      label: "Tento rok",
      value: formatPrice(Number(thisYear._sum.amountSaved ?? 0)),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ušetrené</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Úspory sa počítajú z odškrtnutých položiek nákupných zoznamov, ktoré boli v akcii
          — rozdiel medzi pôvodnou a akciovou cenou. Využitých akcií: {dealsUsed}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/60">
            <CardContent className="py-5">
              <stat.icon className="size-5 text-primary" />
              <p className="mt-2 text-2xl font-bold tabular-nums">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {yearlyEstimate != null && (
        <p className="rounded-lg bg-primary/10 px-3 py-2.5 text-sm">
          📈 Pri tomto tempe ušetríte približne{" "}
          <strong>{formatPrice(yearlyEstimate)}</strong> ročne.
        </p>
      )}

      {recent.length > 0 && (
        <div className="divide-y divide-border/60 rounded-xl border border-border/60">
          {recent.map((entry) => {
            const offer = entry.offerId ? offerById.get(entry.offerId) : null;
            return (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {offer ? offer.product.name : "Nákup z akcie"}
                  {offer && (
                    <span className="text-muted-foreground"> · {offer.chain.name}</span>
                  )}
                </span>
                <span className="font-semibold text-primary tabular-nums">
                  +{formatPrice(Number(entry.amountSaved))}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {dealsUsed === 0 && (
        <p className="rounded-xl border border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
          Zatiaľ žiadne úspory — vytvorte si nákupný zoznam a odškrtávajte nakúpené akcie.
        </p>
      )}
    </div>
  );
}
