import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, CircleX } from "lucide-react";

import { db } from "@/lib/db";
import { verifyUnsubscribeToken } from "@/server/services/notify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Odhlásenie z upozornení" };

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: raw } = await params;
  const [userId, token] = decodeURIComponent(raw).split(".");

  let ok = false;
  if (userId && token && verifyUnsubscribeToken(userId, token)) {
    await db.notificationSettings.updateMany({
      where: { userId },
      data: {
        onFavoriteProduct: false,
        onFavoriteBrand: false,
        onNewLeaflet: false,
        onPriceDrop: false,
        onListCheaper: false,
      },
    });
    ok = true;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md border-border/60">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          {ok ? (
            <>
              <CircleCheck className="size-10 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Hotovo</h1>
              <p className="text-sm text-muted-foreground">
                Všetky e-mailové upozornenia sú vypnuté. Znova ich zapnete v
                nastaveniach účtu.
              </p>
              <Button asChild variant="outline">
                <Link href="/ucet">Nastavenia účtu</Link>
              </Button>
            </>
          ) : (
            <>
              <CircleX className="size-10 text-destructive" />
              <h1 className="text-2xl font-bold tracking-tight">Neplatný odkaz</h1>
              <p className="text-sm text-muted-foreground">
                Odkaz na odhlásenie je poškodený. Upozornenia môžete vypnúť v
                nastaveniach účtu.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
