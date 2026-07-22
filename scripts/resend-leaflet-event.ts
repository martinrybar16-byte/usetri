/**
 * Re-emits leaflet/uploaded for the most recent non-published leaflet —
 * used when the event fired before the pipeline function was registered.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Inngest } from "inngest";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
const inngest = new Inngest({ id: "usetri", isDev: true });

async function main() {
  const leaflet = await prisma.leaflet.findFirstOrThrow({
    where: { status: { in: ["UPLOADED", "PROCESSING"] }, pdfUrl: { not: "" } },
    orderBy: { createdAt: "desc" },
  });
  await inngest.send({ name: "leaflet/uploaded", data: { leafletId: leaflet.id } });
  console.log(`Re-sent leaflet/uploaded for ${leaflet.id} (${leaflet.title})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
