"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";

import { addToListFromProductAction } from "@/server/actions/lists";
import { Button } from "@/components/ui/button";

/** Compact "+" for catalog tiles — adds any product to the default list. */
export function QuickAddButton({
  productId,
  isLoggedIn,
}: {
  productId: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={added ? "secondary" : "outline"}
      size="icon"
      className="size-8 shrink-0"
      disabled={pending || added}
      aria-label={added ? "Pridané do zoznamu" : "Pridať do nákupného zoznamu"}
      title={added ? "Pridané do zoznamu" : "Pridať do nákupného zoznamu"}
      onClick={() => {
        if (!isLoggedIn) {
          router.push("/prihlasenie");
          return;
        }
        startTransition(async () => {
          const res = await addToListFromProductAction(productId);
          if (res.ok) setAdded(true);
        });
      }}
    >
      {added ? <Check className="size-4 text-primary" /> : <Plus className="size-4" />}
    </Button>
  );
}
