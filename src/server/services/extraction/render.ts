import "server-only";
import { PDFiumLibrary } from "@hyzyla/pdfium";
import sharp from "sharp";

/**
 * Renders a PDF into WebP page images via PDFium (WASM — no native deps,
 * works locally and on Vercel).
 */

export type RenderedPage = {
  pageNumber: number;
  webp: Buffer;
  width: number;
  height: number;
};

const TARGET_WIDTH = 1600; // enough detail for vision extraction + crops

export async function renderPdfPages(pdf: Buffer): Promise<RenderedPage[]> {
  const library = await PDFiumLibrary.init();
  try {
    const document = await library.loadDocument(pdf);
    const pages: RenderedPage[] = [];

    for (const page of document.pages()) {
      const { originalWidth } = page.getOriginalSize();
      const scale = Math.min(4, Math.max(1, TARGET_WIDTH / originalWidth));
      const rendered = await page.render({ scale, render: "bitmap" });

      // PDFium emits BGRA; sharp expects RGBA — swap the B and R channels.
      const px = rendered.data;
      for (let i = 0; i < px.length; i += 4) {
        const b = px[i];
        px[i] = px[i + 2];
        px[i + 2] = b;
      }

      const webp = await sharp(px, {
        raw: { width: rendered.width, height: rendered.height, channels: 4 },
      })
        .webp({ quality: 82 })
        .toBuffer();

      pages.push({
        pageNumber: page.number + 1,
        webp,
        width: rendered.width,
        height: rendered.height,
      });
    }

    document.destroy();
    return pages;
  } finally {
    library.destroy();
  }
}

/** Crops a relative bbox out of a rendered page image → WebP product image. */
export async function cropBbox(
  pageWebp: Buffer,
  bbox: { x: number; y: number; w: number; h: number },
  pageWidth: number,
  pageHeight: number
): Promise<Buffer> {
  const left = Math.round(Math.min(Math.max(bbox.x, 0), 0.98) * pageWidth);
  const top = Math.round(Math.min(Math.max(bbox.y, 0), 0.98) * pageHeight);
  const width = Math.max(16, Math.min(Math.round(bbox.w * pageWidth), pageWidth - left));
  const height = Math.max(16, Math.min(Math.round(bbox.h * pageHeight), pageHeight - top));

  return sharp(pageWebp)
    .extract({ left, top, width, height })
    .resize({ width: 600, height: 600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}
