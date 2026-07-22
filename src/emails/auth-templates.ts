/**
 * Slovak transactional email templates for auth flows.
 * Simple inline-styled HTML (best email-client compatibility).
 * Marketing/notification emails get React Email templates in Step 6.
 */

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function shell(title: string, bodyHtml: string, ctaLabel: string, ctaUrl: string) {
  return `<!doctype html>
<html lang="sk">
<body style="margin:0;padding:0;background:#f5f5f4;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:40px 32px;text-align:left;">
        <tr><td style="font-size:20px;font-weight:700;color:#111;padding-bottom:24px;">
          Ušetri<span style="color:#047857;">.</span>
        </td></tr>
        <tr><td style="font-size:17px;font-weight:600;color:#111;padding-bottom:12px;">${title}</td></tr>
        <tr><td style="font-size:14px;line-height:1.6;color:#444;padding-bottom:28px;">${bodyHtml}</td></tr>
        <tr><td>
          <a href="${ctaUrl}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;">${ctaLabel}</a>
        </td></tr>
        <tr><td style="font-size:12px;line-height:1.6;color:#888;padding-top:28px;">
          Ak tlačidlo nefunguje, skopírujte tento odkaz do prehliadača:<br>
          <a href="${ctaUrl}" style="color:#047857;word-break:break-all;">${ctaUrl}</a>
        </td></tr>
      </table>
      <p style="font-size:12px;color:#999;padding-top:16px;">© ${new Date().getFullYear()} Ušetri</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export function verifyEmailTemplate(token: string) {
  const url = `${APP_URL()}/overenie-emailu/${token}`;
  return {
    subject: "Potvrďte svoju e-mailovú adresu",
    html: shell(
      "Vitajte v Ušetri!",
      "Ďakujeme za registráciu. Kliknutím na tlačidlo nižšie potvrďte svoju e-mailovú adresu. Odkaz platí 24 hodín.<br><br>Ak ste sa neregistrovali, tento e-mail ignorujte.",
      "Potvrdiť e-mail",
      url
    ),
  };
}

export function resetPasswordTemplate(token: string) {
  const url = `${APP_URL()}/obnova-hesla/${token}`;
  return {
    subject: "Obnovenie hesla",
    html: shell(
      "Obnovenie hesla",
      "Dostali sme žiadosť o obnovenie hesla k vášmu účtu. Kliknutím na tlačidlo nižšie si nastavíte nové heslo. Odkaz platí 1 hodinu.<br><br>Ak ste o obnovenie nežiadali, tento e-mail ignorujte — vaše heslo zostáva nezmenené.",
      "Nastaviť nové heslo",
      url
    ),
  };
}
