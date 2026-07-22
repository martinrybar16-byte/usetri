"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import { rateOfferAction } from "@/server/actions/lists";
import { Button } from "@/components/ui/button";
import type { RatingValue } from "@/generated/prisma/enums";

const OPTIONS: { value: RatingValue; label: string; icon: typeof ThumbsUp }[] = [
  { value: "GREAT", label: "Super akcia", icon: ThumbsUp },
  { value: "NOT_WORTH", label: "Neoplatí sa", icon: ThumbsDown },
];

export function RatingButtons({
  offerId,
  isLoggedIn,
  initialCounts,
}: {
  offerId: string;
  isLoggedIn: boolean;
  initialCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [counts, setCounts] = useState(initialCounts);
  const [selected, setSelected] = useState<RatingValue | null>(null);
  const [pending, startTransition] = useTransition();

  function rate(value: RatingValue) {
    if (!isLoggedIn) {
      router.push("/prihlasenie");
      return;
    }
    startTransition(async () => {
      const result = await rateOfferAction(offerId, value);
      if ("counts" in result) {
        setCounts(result.counts);
        setSelected(value);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Ohodnoťte akciu:</span>
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={selected === option.value ? "default" : "outline"}
          size="sm"
          disabled={pending}
          onClick={() => rate(option.value)}
        >
          <option.icon className="size-4" />
          {option.label}
          {(counts[option.value] ?? 0) > 0 && (
            <span className="tabular-nums">({counts[option.value]})</span>
          )}
        </Button>
      ))}
    </div>
  );
}
