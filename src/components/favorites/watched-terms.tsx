"use client";

import { useActionState, useTransition } from "react";
import { Plus, X } from "lucide-react";

import {
  addWatchedTermAction,
  removeWatchedTermAction,
} from "@/server/actions/favorites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FormError } from "@/components/auth/form-message";

type Term = { id: string; term: string };

export function WatchedTerms({ terms }: { terms: Term[] }) {
  const [state, formAction, pending] = useActionState(addWatchedTermAction, undefined);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <form action={formAction} className="flex gap-2">
        <Input
          name="term"
          placeholder="napr. Monster Energy, proteín, plienky…"
          maxLength={60}
          required
          className="max-w-sm"
        />
        <Button type="submit" disabled={pending} size="icon" aria-label="Pridať výraz">
          <Plus className="size-4" />
        </Button>
      </form>
      <FormError message={state?.error} />

      <div className="flex flex-wrap gap-2">
        {terms.map((term) => (
          <Badge key={term.id} variant="secondary" className="gap-1 py-1 pr-1 pl-3">
            {term.term}
            <button
              onClick={() => startTransition(() => removeWatchedTermAction(term.id))}
              className="rounded-full p-0.5 hover:bg-background/60"
              aria-label={`Odobrať ${term.term}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        {terms.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Zatiaľ nesledujete žiadne výrazy. Keď sa sledovaný výraz objaví v akcii,
            dáme vám vedieť e-mailom.
          </p>
        )}
      </div>
    </div>
  );
}
