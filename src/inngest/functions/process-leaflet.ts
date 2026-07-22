import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { renderPdfPages, cropBbox } from "@/server/services/extraction/render";
import { getExtractionProvider } from "@/server/services/extraction/provider";
import { matchProduct } from "@/server/services/extraction/match";

/**
 * The AI leaflet pipeline (ARCHITECTURE.md §6):
 * render → extract (per page) → crop → match → stage → status: REVIEW.
 * Each step is durable and independently retried by Inngest.
 */
export const processLeaflet = inngest.createFunction(
  {
    id: "process-leaflet",
    concurrency: 2,
    retries: 2,
    triggers: [{ event: "leaflet/uploaded" }],
    onFailure: async ({ event }) => {
      const { leafletId } = event.data.event.data as { leafletId: string };
      await db.$transaction([
        db.extractionJob.updateMany({
          where: { leafletId, status: { in: ["QUEUED", "RUNNING"] } },
          data: { status: "FAILED", error: "Pipeline failed — see Inngest logs" },
        }),
        db.leaflet.update({ where: { id: leafletId }, data: { status: "UPLOADED" } }),
      ]);
    },
  },
  async ({ event, step }) => {
    const { leafletId } = event.data as { leafletId: string };

    // 0 — create job, mark processing
    const job = await step.run("create-job", async () => {
      const leaflet = await db.leaflet.findUniqueOrThrow({
        where: { id: leafletId },
        include: { chain: true },
      });
      const job = await db.extractionJob.create({
        data: {
          leafletId,
          model: getExtractionProvider().model,
          status: "RUNNING",
          startedAt: new Date(),
        },
      });
      await db.leaflet.update({
        where: { id: leafletId },
        data: { status: "PROCESSING" },
      });
      return {
        jobId: job.id,
        chainName: leaflet.chain.name,
        pdfUrl: leaflet.pdfUrl,
        validFrom: leaflet.validFrom.toISOString().slice(0, 10),
        validTo: leaflet.validTo.toISOString().slice(0, 10),
      };
    });

    // 1 — render PDF pages → storage → LeafletPage rows
    const pages = await step.run("render-pages", async () => {
      const res = await fetch(job.pdfUrl);
      if (!res.ok) throw new Error(`PDF download failed: ${res.status}`);
      const pdf = Buffer.from(await res.arrayBuffer());

      const rendered = await renderPdfPages(pdf);
      const out: { pageId: string; pageNumber: number; imageUrl: string; width: number; height: number }[] = [];

      for (const page of rendered) {
        const imageUrl = await uploadFile(
          `leaflets/${leafletId}/pages/${page.pageNumber}.webp`,
          page.webp,
          "image/webp"
        );
        const row = await db.leafletPage.upsert({
          where: {
            leafletId_pageNumber: { leafletId, pageNumber: page.pageNumber },
          },
          update: { imageUrl, width: page.width, height: page.height },
          create: {
            leafletId,
            pageNumber: page.pageNumber,
            imageUrl,
            width: page.width,
            height: page.height,
          },
        });
        out.push({
          pageId: row.id,
          pageNumber: page.pageNumber,
          imageUrl,
          width: page.width,
          height: page.height,
        });
      }

      await db.leaflet.update({
        where: { id: leafletId },
        data: { pageCount: rendered.length },
      });
      return out;
    });

    // 2 — extract + crop + match, one durable step per page
    let totalItems = 0;
    for (const page of pages) {
      const count = await step.run(`extract-page-${page.pageNumber}`, async () => {
        const res = await fetch(page.imageUrl);
        const imageBuffer = Buffer.from(await res.arrayBuffer());

        const provider = getExtractionProvider();
        const items = await provider.extractPage(imageBuffer, {
          chainName: job.chainName,
          validFrom: job.validFrom,
          validTo: job.validTo,
          pageNumber: page.pageNumber,
        });

        for (const [i, item] of items.entries()) {
          // Crop the product tile out of the page
          let cropUrl: string | null = null;
          if (item.bbox) {
            try {
              const crop = await cropBbox(imageBuffer, item.bbox, page.width, page.height);
              cropUrl = await uploadFile(
                `leaflets/${leafletId}/crops/${page.pageNumber}-${i}.webp`,
                crop,
                "image/webp"
              );
            } catch {
              // crop failure is not fatal — offer just won't have an image
            }
          }

          const match = await matchProduct(item);

          await db.extractedItem.create({
            data: {
              jobId: job.jobId,
              leafletPageId: page.pageId,
              raw: { ...item, _cropUrl: cropUrl },
              matchedProductId: match.confidence >= 0.85 ? match.productId : null,
              matchConfidence: match.confidence,
              extractionConfidence: item.confidence,
            },
          });
        }

        await db.extractionJob.update({
          where: { id: job.jobId },
          data: { pagesDone: page.pageNumber },
        });
        return items.length;
      });
      totalItems += count;
    }

    // 3 — finalize: job done, leaflet ready for review
    await step.run("finalize", async () => {
      await db.$transaction([
        db.extractionJob.update({
          where: { id: job.jobId },
          data: { status: "DONE", finishedAt: new Date() },
        }),
        db.leaflet.update({ where: { id: leafletId }, data: { status: "REVIEW" } }),
      ]);
    });

    return { pages: pages.length, items: totalItems };
  }
);
