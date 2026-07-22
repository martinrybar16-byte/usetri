"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ListPlus } from "lucide-react";

import { addToListFromProductAction } from "@/server/actions/lists";
import { Button } from "@/components/ui/button";

export function AddToListButton({
  productId,
  isLoggedIn,
}: {
  productId: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [added, setAdded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    if (!isLoggedIn) {
      router.push("/prihlasenie");
      return;
    }
    startTransition(async () => {
      const result = await addToListFromProductAction(productId);
      if (result.ok) setAdded(result.listName ?? "zoznamu");
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={pending || !!added} onClick={add}>
      {added ? <Check className="size-4 text-primary" /> : <ListPlus className="size-4" />}
      {added ? `V zozname „${added}"` : "Do zoznamu"}
    </Button>
  );
}
