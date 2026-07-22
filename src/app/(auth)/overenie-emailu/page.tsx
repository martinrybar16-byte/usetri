import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Overenie e-mailu" };

export default async function VerifyEmailInfoPage() {
  const t = await getTranslations("auth");

  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <MailCheck className="size-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t("checkInboxTitle")}</h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {t("checkInboxText")}
        </p>
      </CardContent>
    </Card>
  );
}
