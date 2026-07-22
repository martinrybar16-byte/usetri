"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { forgotPasswordAction, type ActionState } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormError, FormSuccess } from "@/components/auth/form-message";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    forgotPasswordAction,
    undefined
  );

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-2xl tracking-tight">{t("forgotTitle")}</CardTitle>
        <CardDescription>{t("forgotSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <FormError message={state?.error} />
          <FormSuccess message={state?.success} />

          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("submitting") : t("forgotButton")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link
            href="/prihlasenie"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            ← {t("backToLogin")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
