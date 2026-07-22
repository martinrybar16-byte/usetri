/**
 * Slovak notification email templates (deal alerts + digests).
 */

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type OfferEmailItem = {
  productName: string;
  productSlug: string;
  chainName: string;
  price: string; // preformatted "0,89 €"
  originalPrice: string | null;
  discountPct: number | null;
  reason: string; // "sledovaný produkt" | "obľúbená značka" | ...
};

function offerRow(item: OfferEmailItem): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #eee;">
      <a href="${APP_URL()}/produkty/${item.productSlug}" style="color:#111;text-decoration:none;font-weight:600;font-size:14px;">${item.productName}</a>
      <div style="font-size:12px;color:#888;padding-top:2px;">${item.chainName} · ${item.reason}</div>
    </td>
    <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">
      <span style="color:#dc2626;font-weight:700;font-size:15px;">${item.price}</span>
      ${item.originalPrice ? `<span style="color:#999;text-decoration:line-through;font-size:12px;padding-left:6px;">${item.originalPrice}</span>` : ""}
      ${item.discountPct ? `<div style="font-size:12px;color:#047857;font-weight:600;">−${item.discountPct} %</div>` : ""}
    </td>
  </tr>`;
}

export function dealsEmailTemplate(options: {
  heading: string;
  intro: string;
  items: OfferEmailItem[];
  unsubscribeUrl: string;
}) {
  const { heading, intro, items, unsubscribeUrl } = options;
  const rows = items.slice(0, 30).map(offerRow).join("");
  const more =
    items.length > 30
      ? `<p style="font-size:13px;color:#666;">…a ďalších ${items.length - 30} ponúk na webe.</p>`
      : "";

  return `<!doctype html>
<html lang="sk">
<body style="margin:0;padding:0;background:#f5f5f4;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:36px 32px;text-align:left;">
        <tr><td style="font-size:20px;font-weight:700;color:#111;padding-bottom:20px;">
          Ušetri<span style="color:#047857;">.</span>
        </td></tr>
        <tr><td style="font-size:17px;font-weight:600;color:#111;padding-bottom:6px;">${heading}</td></tr>
        <tr><td style="font-size:13px;color:#666;padding-bottom:16px;">${intro}</td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
          ${more}
        </td></tr>
        <tr><td style="padding-top:24px;">
          <a href="${APP_URL()}/zlavy" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:10px;">Zobraziť všetky zľavy</a>
        </td></tr>
        <tr><td style="font-size:11px;line-height:1.6;color:#999;padding-top:28px;">
          Tento e-mail ste dostali, lebo máte zapnuté upozornenia na Ušetri.<br>
          <a href="${unsubscribeUrl}" style="color:#999;">Odhlásiť sa z upozornení</a> ·
          <a href="${APP_URL()}/ucet" style="color:#999;">Nastavenia</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
