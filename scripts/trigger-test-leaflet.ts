/**
 * E2E pipeline trigger: uploads the test PDF to storage, creates a Leaflet
 * row and emits leaflet/uploaded — exactly what the admin upload form does.
 * Requires `npm run dev` and `npm run inngest:dev` to be running.
 * Usage: npx tsx scripts/trigger-test-leaflet.ts [path/to.pdf]
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { Inngest } from "inngest";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
const inngest = new Inngest({ id: "usetri", isDev: true });

async function main() {
  const pdfPath = process.argv[2] ?? "test-letak.pdf";
  const pdf = readFileSync(pdfPath);

  const chain = await prisma.chain.findUniqueOrThrow({ where: { slug: "terno" } });
  const country = await prisma.country.findUniqueOrThrow({ where: { code: "SK" } });

  const leaflet = await prisma.leaflet.create({
    data: {
      chainId: chain.id,
      countryId: country.id,
      title: "Testovací leták (AI pipeline)",
      pdfUrl: "",
      validFrom: new Date(),
      validTo: new Date(Date.now() + 6 * 86_400_000),
      status: "UPLOADED",
    },
  });

  const path = `leaflets/${leaflet.id}/original.pdf`;
  const { error } = await supabase.storage
    .from("usetri")
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (error) throw error;
  const { data: pub } = supabase.storage.from("usetri").getPublicUrl(path);

  await prisma.leaflet.update({
    where: { id: leaflet.id },
    data: { pdfUrl: pub.publicUrl },
  });

  await inngest.send({ name: "leaflet/uploaded", data: { leafletId: leaflet.id } });
  console.log(`Leaflet ${leaflet.id} uploaded and queued. Watch: http://localhost:8288`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
