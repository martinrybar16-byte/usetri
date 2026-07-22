"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  changePasswordAction,
  updateProfileAction,
  type ActionState,
} from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, FormSuccess } from "@/components/auth/form-message";

export function UpdateProfileForm({ defaultName }: { defaultName: string }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateProfileAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />
      <div className="space-y-2">
        <Label htmlFor="name">{t("auth.name")}</Label>
        <Input id="name" name="name" defaultValue={defaultName} autoComplete="name" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? t("auth.submitting") : t("account.saveProfile")}
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    changePasswordAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />
      <div className="space-y-2">
        <Label htmlFor="currentPassword">{t("account.currentPassword")}</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">{t("auth.newPassword")}</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? t("auth.submitting") : t("account.changePassword")}
      </Button>
    </form>
  );
}
