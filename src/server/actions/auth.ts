"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { auth, signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "@/lib/validators/auth";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createToken, consumeToken } from "@/server/auth/tokens";
import { sendEmail } from "@/server/services/email";
import {
  resetPasswordTemplate,
  verifyEmailTemplate,
} from "@/emails/auth-templates";

export type ActionState = { error?: string; success?: string } | undefined;

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

const RATE_LIMITED_MSG = (s: number) =>
  `Príliš veľa pokusov. Skúste to znova o ${Math.max(1, Math.ceil(s / 60))} min.`;

// ─────────────────────────── Register ────────────────────────────────

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  const { email, password, name } = parsed.data;

  const ip = await clientIp();
  const rl = rateLimit(`register:${ip}`, 5, 3600);
  if (!rl.success) return { error: RATE_LIMITED_MSG(rl.retryAfterSeconds) };

  const existing = await db.user.findUnique({ where: { email } });

  if (!existing) {
    const user = await db.user.create({
      data: {
        email,
        name: name || null,
        passwordHash: await hashPassword(password),
        notificationSettings: { create: {} },
      },
    });
    const token = await createToken(user.id, "EMAIL_VERIFY");
    const tpl = verifyEmailTemplate(token);
    await sendEmail({ to: email, ...tpl, type: "email_verify", userId: user.id });
  } else if (!existing.emailVerifiedAt) {
    // Re-registration of an unverified address → resend the verification link
    const token = await createToken(existing.id, "EMAIL_VERIFY");
    const tpl = verifyEmailTemplate(token);
    await sendEmail({ to: email, ...tpl, type: "email_verify", userId: existing.id });
  }
  // Existing verified account → send nothing (prevents account enumeration);
  // the UI shows the same "check your inbox" screen in all cases.

  redirect("/overenie-emailu");
}

// ───────────────────────────── Login ─────────────────────────────────

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }

  const ip = await clientIp();
  const rl = rateLimit(`login:${ip}`, 10, 900);
  if (!rl.success) return { error: RATE_LIMITED_MSG(rl.retryAfterSeconds) };

  // Distinguish "unverified email" from bad credentials for better UX
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user && !user.emailVerifiedAt) {
    return {
      error:
        "E-mailová adresa ešte nie je potvrdená. Skontrolujte si schránku alebo sa registrujte znova pre nový odkaz.",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Nesprávny e-mail alebo heslo." };
    }
    throw err; // NEXT_REDIRECT on success — must propagate
  }
  return undefined;
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

// ─────────────────────── Forgot / reset password ─────────────────────

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }

  const ip = await clientIp();
  const rl = rateLimit(`forgot:${ip}`, 5, 3600);
  if (!rl.success) return { error: RATE_LIMITED_MSG(rl.retryAfterSeconds) };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = await createToken(user.id, "PASSWORD_RESET");
    const tpl = resetPasswordTemplate(token);
    await sendEmail({
      to: user.email,
      ...tpl,
      type: "password_reset",
      userId: user.id,
    });
  }

  // Same message whether or not the account exists
  return {
    success:
      "Ak účet s touto adresou existuje, poslali sme vám odkaz na obnovenie hesla.",
  };
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }

  const userId = await consumeToken(parsed.data.token, "PASSWORD_RESET");
  if (!userId) {
    return {
      error: "Odkaz na obnovenie hesla je neplatný alebo vypršal. Požiadajte o nový.",
    };
  }

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  redirect("/prihlasenie?obnovene=1");
}

// ─────────────────────────── Profile ─────────────────────────────────

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Musíte byť prihlásený." };

  const parsed = updateProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name || null },
  });

  return { success: "Profil bol uložený." };
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Musíte byť prihlásený." };

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Účet sa nenašiel." };

  const valid = await verifyPassword(user.passwordHash, parsed.data.currentPassword);
  if (!valid) return { error: "Súčasné heslo nie je správne." };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  return { success: "Heslo bolo zmenené." };
}
