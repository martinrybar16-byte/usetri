"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { resetPasswordAction, type ActionState } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormError } from "@/components/auth/form-message";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    undefined
  );

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-2xl tracking-tight">{t("resetTitle")}</CardTitle>
        <CardDescription>{t("resetSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <FormError message={state?.error} />
          <input type="hidden" name="token" value={token} />

          <div className="space-y-2">
            <Label htmlFor="password">{t("newPassword")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("submitting") : t("resetButton")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
