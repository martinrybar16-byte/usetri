"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteListAction } from "@/server/actions/lists";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

export function DeleteListButton({ listId }: { listId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="size-4" />
          Vymazať
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vymazať zoznam?</DialogTitle>
          <DialogDescription>
            Zoznam aj všetky jeho položky budú natrvalo odstránené.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Zrušiť</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => startTransition(() => deleteListAction(listId))}
          >
            {pending ? "Maže sa…" : "Vymazať"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
