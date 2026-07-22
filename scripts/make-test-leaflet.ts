/**
 * Generates a minimal one-page "leaflet" PDF with test offers, for
 * exercising the AI pipeline without a real supermarket PDF.
 * Usage: npx tsx scripts/make-test-leaflet.ts [output.pdf]
 */
import { writeFileSync } from "fs";

const LINES: [string, number, boolean][] = [
  // [text, fontSize, bold]
  ["TESTO MARKET", 30, true],
  ["AKCIOVY LETAK - SUPER CENY TOHTO TYZDNA", 16, true],
  ["", 12, false],
  ["Rajo Polotucne mlieko 1,5%   1 l", 14, true],
  ["akciova cena 0,89 EUR   povodna cena 1,19 EUR   ZLAVA -25%", 12, false],
  ["", 12, false],
  ["Milka Mliecna cokolada   100 g", 14, true],
  ["akciova cena 0,95 EUR   povodna cena 1,45 EUR   ZLAVA -34%", 12, false],
  ["", 12, false],
  ["Kofola Original   2 l", 14, true],
  ["akciova cena 1,19 EUR   povodna cena 1,79 EUR   len s vernostnou kartou", 12, false],
  ["", 12, false],
  ["Kuracie prsia cerstve   1 kg", 14, true],
  ["akciova cena 4,99 EUR   povodna cena 6,99 EUR   ZLAVA -29%", 12, false],
  ["", 12, false],
  ["Tatranska horka cokolada 70%   90 g", 14, true],
  ["akciova cena 1,29 EUR   povodna cena 1,99 EUR   ZLAVA -35%", 12, false],
  ["", 12, false],
  ["Ponuka plati od 14.7. do 20.7. alebo do vypredania zasob.", 10, false],
];

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

let content = "";
let y = 790;
for (const [text, size, bold] of LINES) {
  if (text) {
    content += `BT /${bold ? "F1" : "F2"} ${size} Tf 50 ${y} Td (${esc(text)}) Tj ET\n`;
  }
  y -= size + 10;
}

const objects: string[] = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  `<< /Length ${content.length} >>\nstream\n${content}endstream`,
];

let pdf = "%PDF-1.4\n";
const offsets: number[] = [];
for (const [i, body] of objects.entries()) {
  offsets.push(pdf.length);
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
}
const xrefStart = pdf.length;
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const off of offsets) {
  pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

const out = process.argv[2] ?? "test-letak.pdf";
writeFileSync(out, Buffer.from(pdf, "latin1"));
console.log(`Wrote ${out} (${pdf.length} bytes)`);
