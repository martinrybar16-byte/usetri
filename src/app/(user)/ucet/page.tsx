import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChangePasswordForm,
  UpdateProfileForm,
} from "@/components/auth/profile-forms";
import { NotificationSettingsForm } from "@/components/favorites/notification-settings-form";

export const metadata: Metadata = { title: "Môj účet" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/prihlasenie");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { notificationSettings: true },
  });
  if (!user) redirect("/prihlasenie");

  const settings = user.notificationSettings ?? {
    frequency: "WEEKLY" as const,
    minDiscountPct: null,
    onFavoriteProduct: true,
    onFavoriteBrand: true,
    onNewLeaflet: true,
    onPriceDrop: true,
    onListCheaper: true,
  };

  const t = await getTranslations();
  const format = await getFormatter();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("account.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user.email} ·{" "}
          {t("account.memberSince", {
            date: format.dateTime(user.createdAt, { dateStyle: "long" }),
          })}
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{t("account.profileSection")}</CardTitle>
          <CardDescription>{t("account.profileHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <UpdateProfileForm defaultName={user.name ?? ""} />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Upozornenia</CardTitle>
          <CardDescription>
            Kedy a ako často vám máme posielať e-maily o zľavách.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationSettingsForm settings={settings} />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{t("account.passwordSection")}</CardTitle>
          <CardDescription>{t("account.passwordHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
