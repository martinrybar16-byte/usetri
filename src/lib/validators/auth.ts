import { z } from "zod";

export const emailSchema = z
  .email({ error: "Zadajte platnú e-mailovú adresu." })
  .max(254)
  .transform((v) => v.trim().toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, { error: "Heslo musí mať aspoň 8 znakov." })
  .max(128, { error: "Heslo môže mať najviac 128 znakov." });

export const registerSchema = z.object({
  name: z.string().trim().max(100).optional(),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Zadajte heslo." }),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: "Zadajte súčasné heslo." }),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().max(100),
});
