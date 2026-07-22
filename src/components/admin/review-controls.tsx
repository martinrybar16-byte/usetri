"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Check, RefreshCw, Send, X } from "lucide-react";

import {
  bulkApproveAction,
  publishLeafletAction,
  reprocessLeafletAction,
  reviewItemAction,
} from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function ReprocessButton({ leafletId }: { leafletId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => reprocessLeafletAction(leafletId))}
    >
      <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />
      Spracovať znova
    </Button>
  );
}

export function BulkApproveButton({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<number | null>(null);
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const { approved } = await bulkApproveAction(jobId, 0.8);
          setResult(approved);
        })
      }
    >
      <Check className="size-4" />
      {result != null
        ? `Schválených ${result}`
        : pending
          ? "Schvaľuje sa…"
          : "Hromadne schváliť istotu ≥ 80 %"}
    </Button>
  );
}

export function PublishButton({ leafletId }: { leafletId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await publishLeafletAction(leafletId);
            setMessage(res?.success ?? res?.error ?? null);
          })
        }
      >
        <Send className="size-4" />
        {pending ? "Zverejňuje sa…" : "Zverejniť schválené"}
      </Button>
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </span>
  );
}

// ───────────────────────── Item review card ──────────────────────────

type ItemRaw = {
  name?: string;
  brand?: string | null;
  unit_size?: string | null;
  price?: number;
  original_price?: number | null;
  conditions?: string | null;
  category_guess?: string | null;
  confidence?: number;
  _cropUrl?: string | null;
};

export function ItemReviewCard({
  itemId,
  raw,
  matchedProductName,
  matchConfidence,
}: {
  itemId: string;
  raw: ItemRaw;
  matchedProductName: string | null;
  matchConfidence: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [name, setName] = useState(raw.name ?? "");
  const [brand, setBrand] = useState(raw.brand ?? "");
  const [unitSize, setUnitSize] = useState(raw.unit_size ?? "");
  const [price, setPrice] = useState(String(raw.price ?? ""));
  const [originalPrice, setOriginalPrice] = useState(
    raw.original_price != null ? String(raw.original_price) : ""
  );

  const confidence = Math.round((raw.confidence ?? 0) * 100);

  function decide(decision: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      await reviewItemAction(
        itemId,
        decision,
        decision === "APPROVED"
          ? {
              name: name || undefined,
              brand: brand || undefined,
              unit_size: unitSize || undefined,
              price: price ? Number(price.replace(",", ".")) : undefined,
              original_price: originalPrice
                ? Number(originalPrice.replace(",", "."))
                : null,
            }
          : undefined
      );
      setDone(decision);
    });
  }

  if (done) {
    return (
      <Card className="border-border/60 opacity-60">
        <CardContent className="flex items-center gap-2 py-3 text-sm">
          {done === "APPROVED" ? (
            <Check className="size-4 text-primary" />
          ) : (
            <X className="size-4 text-destructive" />
          )}
          {name || raw.name} — {done === "APPROVED" ? "schválené" : "zamietnuté"}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-wrap gap-4 py-4">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/40">
          {raw._cropUrl ? (
            <Image src={raw._cropUrl} alt="" fill sizes="96px" className="object-contain" />
          ) : (
            <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
              bez obr.
            </span>
          )}
        </div>

        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Názov" />
          <div className="flex gap-2">
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Značka" />
            <Input
              value={unitSize}
              onChange={(e) => setUnitSize(e.target.value)}
              placeholder="Balenie"
              className="w-28"
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Cena €"
              className="w-24 tabular-nums"
            />
            <Input
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="Pôvodná €"
              className="w-24 tabular-nums"
            />
            {raw.conditions && (
              <span className="truncate text-xs text-muted-foreground">{raw.conditions}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Badge variant={confidence >= 80 ? "secondary" : "destructive"} className="tabular-nums">
              istota {confidence} %
            </Badge>
            {raw.category_guess && <Badge variant="outline">{raw.category_guess}</Badge>}
            {matchedProductName ? (
              <Badge variant="outline" className="max-w-48 truncate">
                ↔ {matchedProductName} ({Math.round((matchConfidence ?? 0) * 100)} %)
              </Badge>
            ) : (
              <Badge variant="outline">nový produkt</Badge>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <Button size="sm" disabled={pending} onClick={() => decide("APPROVED")}>
            <Check className="size-4" /> Schváliť
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => decide("REJECTED")}>
            <X className="size-4" /> Zamietnuť
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
