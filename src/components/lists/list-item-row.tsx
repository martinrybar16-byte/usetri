"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import { removeItemAction, toggleItemAction } from "@/server/actions/lists";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

type Props = {
  itemId: string;
  name: string;
  productSlug: string | null;
  quantity: number;
  unitSize: string | null;
  checked: boolean;
  bestPrice: string | null; // preformatted
  bestChain: string | null;
};

export function ListItemRow({
  itemId,
  name,
  productSlug,
  quantity,
  unitSize,
  checked,
  bestPrice,
  bestChain,
}: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 ${checked ? "opacity-50" : ""}`}
    >
      <Checkbox
        checked={checked}
        disabled={pending}
        onCheckedChange={() => startTransition(() => toggleItemAction(itemId))}
        aria-label={`Odškrtnúť ${name}`}
      />
      <div className="min-w-0 flex-1">
        {productSlug ? (
          <Link
            href={`/produkty/${productSlug}`}
            className={`text-sm font-medium hover:underline ${checked ? "line-through" : ""}`}
          >
            {name}
          </Link>
        ) : (
          <span className={`text-sm font-medium ${checked ? "line-through" : ""}`}>
            {name}
          </span>
        )}
        <p className="text-xs text-muted-foreground">
          {quantity > 1 ? `${quantity}× ` : ""}
          {unitSize ?? ""}
          {bestPrice
            ? ` · najlacnejšie ${bestPrice} (${bestChain})`
            : productSlug
              ? " · momentálne nie je v akcii"
              : " · voľná položka"}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() => startTransition(() => removeItemAction(itemId))}
        aria-label={`Odstrániť ${name}`}
      >
        <Trash2 className="size-4 text-muted-foreground" />
      </Button>
    </div>
  );
}
