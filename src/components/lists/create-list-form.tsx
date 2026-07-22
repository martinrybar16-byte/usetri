"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";

import { createListAction } from "@/server/actions/lists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/auth/form-message";

export function CreateListForm() {
  const [state, formAction, pending] = useActionState(createListAction, undefined);

  return (
    <div className="space-y-2">
      <form action={formAction} className="flex gap-2">
        <Input
          name="name"
          placeholder="napr. Týždenný nákup, Grilovačka…"
          maxLength={60}
          required
          className="max-w-sm"
        />
        <Button type="submit" disabled={pending}>
          <Plus className="size-4" />
          {pending ? "Vytvára sa…" : "Nový zoznam"}
        </Button>
      </form>
      <FormError message={state?.error} />
    </div>
  );
}
