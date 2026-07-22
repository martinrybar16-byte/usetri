import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, CircleX } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { db } from "@/lib/db";
import { consumeToken } from "@/server/auth/tokens";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Overenie e-mailu" };

export default async function VerifyEmailTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("auth");

  const userId = await consumeToken(token, "EMAIL_VERIFY");
  if (userId) {
    await db.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  const ok = Boolean(userId);

  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div
          className={`flex size-14 items-center justify-center rounded-2xl ${
            ok ? "bg-primary/10" : "bg-destructive/10"
          }`}
        >
          {ok ? (
            <CircleCheck className="size-7 text-primary" />
          ) : (
            <CircleX className="size-7 text-destructive" />
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {ok ? t("verifySuccessTitle") : t("verifyFailTitle")}
        </h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {ok ? t("verifySuccessText") : t("verifyFailText")}
        </p>
        <Button asChild className="mt-2">
          <Link href={ok ? "/prihlasenie" : "/registracia"}>
            {ok ? t("loginButton") : t("registerLink")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
