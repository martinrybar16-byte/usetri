import Link from "next/link";
import { BookOpen } from "lucide-react";

import type { Chain, Leaflet } from "@/generated/prisma/client";
import { formatShortDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

export function LeafletCard({
  leaflet,
  offerCount,
}: {
  leaflet: Leaflet & { chain: Chain };
  offerCount?: number;
}) {
  return (
    <Link href={`/letaky/${leaflet.id}`} className="group block h-full">
      <Card className="h-full gap-0 overflow-hidden border-border/60 py-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <div
          className="flex aspect-[3/4] items-center justify-center"
          style={{ backgroundColor: `${leaflet.chain.color ?? "#666"}14` }}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <BookOpen
              className="size-10"
              style={{ color: leaflet.chain.color ?? undefined }}
            />
            <span className="text-lg font-bold" style={{ color: leaflet.chain.color ?? undefined }}>
              {leaflet.chain.name}
            </span>
          </div>
        </div>
        <CardContent className="space-y-1 p-3">
          <p className="line-clamp-1 text-sm font-medium">{leaflet.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatShortDate(leaflet.validFrom)} – {formatShortDate(leaflet.validTo)}
            {offerCount != null && offerCount > 0 ? ` · ${offerCount} ponúk` : ""}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
