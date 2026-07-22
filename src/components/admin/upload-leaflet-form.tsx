"use client";

import { useActionState } from "react";

import { uploadLeafletAction, type AdminActionState } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormError } from "@/components/auth/form-message";

type Chain = { id: string; name: string };

export function UploadLeafletForm({ chains }: { chains: Chain[] }) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(
    uploadLeafletAction,
    undefined
  );

  // Default validity: today → +7 days
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Nahrať leták</CardTitle>
        <CardDescription>
          PDF sa po nahratí automaticky spracuje AI — výsledky nájdete v Kontrole AI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <FormError message={state?.error} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="chainId">Obchod</Label>
              <Select name="chainId" required>
                <SelectTrigger id="chainId" className="w-full">
                  <SelectValue placeholder="Vyberte obchod" />
                </SelectTrigger>
                <SelectContent>
                  {chains.map((chain) => (
                    <SelectItem key={chain.id} value={chain.id}>
                      {chain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Názov letáku</Label>
              <Input id="title" name="title" placeholder="Leták od štvrtka" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validFrom">Platnosť od</Label>
              <Input id="validFrom" name="validFrom" type="date" defaultValue={today} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validTo">Platnosť do</Label>
              <Input id="validTo" name="validTo" type="date" defaultValue={nextWeek} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdf">PDF súbor</Label>
            <Input id="pdf" name="pdf" type="file" accept="application/pdf" required />
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? "Nahráva sa…" : "Nahrať a spracovať"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
