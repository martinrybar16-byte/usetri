import "server-only";
import { Resend } from "resend";

import { db } from "@/lib/db";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  type: string; // e.g. "email_verify" | "password_reset" — recorded in EmailLog
  userId?: string;
};

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Sends a transactional email via Resend. Without RESEND_API_KEY (local dev)
 * the email is printed to the server console instead, so flows stay testable.
 * Every attempt is recorded in EmailLog.
 */
export async function sendEmail({ to, subject, html, type, userId }: SendEmailInput) {
  let providerMessageId: string | null = null;
  let status: "SENT" | "BOUNCED" = "SENT";

  if (resend) {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Ušetri <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    if (error) {
      status = "BOUNCED";
      console.error(`[email] Resend error for ${type}:`, error);
    } else {
      providerMessageId = data?.id ?? null;
    }
  } else {
    console.log(
      `\n[email:dev] ─────────────────────────────────────────\n` +
        `To: ${to}\nSubject: ${subject}\n\n${html.replace(/<[^>]+>/g, "").trim()}\n` +
        `──────────────────────────────────────────────────────\n`
    );
  }

  await db.emailLog.create({
    data: { userId, type, subject, providerMessageId, status },
  });

  return status === "SENT";
}
