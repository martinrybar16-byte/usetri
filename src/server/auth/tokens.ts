import "server-only";
import { createHash, randomBytes } from "crypto";

import { db } from "@/lib/db";
import type { TokenType } from "@/generated/prisma/enums";

const TOKEN_TTL_HOURS: Record<TokenType, number> = {
  EMAIL_VERIFY: 24,
  PASSWORD_RESET: 1,
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a single-use token for the user and returns the raw value
 * (only the SHA-256 hash is stored). Invalidates older tokens of the same type.
 */
export async function createToken(userId: string, type: TokenType): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS[type] * 3_600_000);

  await db.$transaction([
    db.verificationToken.deleteMany({ where: { userId, type, usedAt: null } }),
    db.verificationToken.create({
      data: { userId, type, tokenHash: hashToken(raw), expiresAt },
    }),
  ]);

  return raw;
}

/**
 * Validates a raw token and atomically marks it used.
 * Returns the owning userId, or null when invalid/expired/used.
 */
export async function consumeToken(
  raw: string,
  type: TokenType
): Promise<string | null> {
  const { count } = await db.verificationToken.updateMany({
    where: {
      tokenHash: hashToken(raw),
      type,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { usedAt: new Date() },
  });
  if (count === 0) return null;

  const token = await db.verificationToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    select: { userId: true },
  });
  return token?.userId ?? null;
}
