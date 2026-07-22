"use client";

import { useActionState } from "react";

import { updateNotificationSettingsAction } from "@/server/actions/favorites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormError, FormSuccess } from "@/components/auth/form-message";

type Settings = {
  frequency: "INSTANT" | "DAILY" | "WEEKLY";
  minDiscountPct: number | null;
  onFavoriteProduct: boolean;
  onFavoriteBrand: boolean;
  onNewLeaflet: boolean;
  onPriceDrop: boolean;
  onListCheaper: boolean;
};

const TOGGLES: { name: keyof Settings; label: string }[] = [
  { name: "onFavoriteProduct", label: "Obľúbený produkt je v akcii" },
  { name: "onFavoriteBrand", label: "Obľúbená značka je v akcii" },
  { name: "onNewLeaflet", label: "Nový leták obľúbeného obchodu" },
  { name: "onPriceDrop", label: "Pokles ceny sledovaného produktu" },
  { name: "onListCheaper", label: "Nákupný zoznam sa dá kúpiť lacnejšie" },
];

export function NotificationSettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState(
    updateNotificationSettingsAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-5">
      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="frequency">Frekvencia e-mailov</Label>
          <Select name="frequency" defaultValue={settings.frequency}>
            <SelectTrigger id="frequency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INSTANT">Okamžite</SelectItem>
              <SelectItem value="DAILY">Denný súhrn (7:00)</SelectItem>
              <SelectItem value="WEEKLY">Týždenný súhrn (štvrtok)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="minDiscountPct">Len zľavy aspoň (%)</Label>
          <Input
            id="minDiscountPct"
            name="minDiscountPct"
            type="number"
            min={0}
            max={90}
            placeholder="bez limitu"
            defaultValue={settings.minDiscountPct ?? ""}
          />
        </div>
      </div>

      <div className="space-y-3">
        {TOGGLES.map((toggle) => (
          <div key={toggle.name} className="flex items-center justify-between gap-4">
            <Label htmlFor={toggle.name} className="font-normal">
              {toggle.label}
            </Label>
            <Switch
              id={toggle.name}
              name={toggle.name}
              defaultChecked={Boolean(settings[toggle.name])}
            />
          </div>
        ))}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Ukladá sa…" : "Uložiť nastavenia"}
      </Button>
    </form>
  );
}
