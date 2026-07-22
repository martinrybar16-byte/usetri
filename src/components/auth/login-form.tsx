"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { loginAction, type ActionState } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormError, FormSuccess } from "@/components/auth/form-message";

export function LoginForm({ resetDone }: { resetDone?: boolean }) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    loginAction,
    undefined
  );

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-2xl tracking-tight">{t("loginTitle")}</CardTitle>
        <CardDescription>{t("loginSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {resetDone && !state?.error && (
            <FormSuccess message={t("passwordResetDone")} />
          )}
          <FormError message={state?.error} />

          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("password")}</Label>
              <Link
                href="/zabudnute-heslo"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("submitting") : t("loginButton")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/registracia" className="font-medium text-foreground underline-offset-4 hover:underline">
            {t("registerLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
