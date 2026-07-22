import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Administrácia" };

export default async function AdminDashboardPage() {
  const now = new Date();
  const [users, products, activeOffers, pendingItems, leaflets, emails] =
    await Promise.all([
      db.user.count(),
      db.product.count({ where: { status: "ACTIVE" } }),
      db.offer.count({ where: { status: "PUBLISHED", validTo: { gte: now } } }),
      db.extractedItem.count({ where: { reviewStatus: "PENDING" } }),
      db.leaflet.count({ where: { status: { in: ["PROCESSING", "REVIEW"] } } }),
      db.emailLog.count(),
    ]);

  const stats = [
    { label: "Používatelia", value: users },
    { label: "Produkty", value: products },
    { label: "Aktívne ponuky", value: activeOffers },
    { label: "Odoslané e-maily", value: emails },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Prehľad</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/60">
            <CardContent className="py-5">
              <p className="text-3xl font-bold tabular-nums">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(pendingItems > 0 || leaflets > 0) && (
        <Card className="mt-6 border-border/60">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            {leaflets > 0 && <Badge variant="secondary">{leaflets} letákov v spracovaní</Badge>}
            {pendingItems > 0 && (
              <>
                <Badge>{pendingItems} položiek čaká na kontrolu</Badge>
                <Link href="/admin/kontrola" className="text-sm font-medium text-primary hover:underline">
                  Otvoriť kontrolu →
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
