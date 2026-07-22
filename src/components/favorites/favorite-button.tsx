"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

import { toggleFavoriteAction } from "@/server/actions/favorites";
import { Button } from "@/components/ui/button";
import type { FavoriteType } from "@/generated/prisma/enums";

type Props = {
  entityType: FavoriteType;
  entityId: string;
  initialFavorited: boolean;
  isLoggedIn: boolean;
  label?: string;
};

export function FavoriteButton({
  entityType,
  entityId,
  initialFavorited,
  isLoggedIn,
  label,
}: Props) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (!isLoggedIn) {
      router.push("/prihlasenie");
      return;
    }
    startTransition(async () => {
      const result = await toggleFavoriteAction(entityType, entityId);
      if ("favorited" in result) setFavorited(result.favorited);
    });
  }

  return (
    <Button
      variant={favorited ? "default" : "outline"}
      size={label ? "sm" : "icon"}
      disabled={pending}
      onClick={toggle}
      aria-pressed={favorited}
      aria-label={favorited ? "Odobrať z obľúbených" : "Pridať do obľúbených"}
    >
      <Heart className={`size-4 ${favorited ? "fill-current" : ""}`} />
      {label && (favorited ? "Sledované" : label)}
    </Button>
  );
}
