/**
 * Demo data for development: 3 published leaflets and ~30 products with
 * realistic Slovak offers across chains. Idempotent (slug-based upserts).
 * Run with: npm run db:seed:demo
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type DemoOffer = {
  chain: string;
  price: number;
  original?: number;
  conditions?: string;
};

type DemoProduct = {
  name: string;
  brand?: string;
  category: string;
  unit?: string;
  unitSize?: string;
  attributes?: Record<string, boolean>;
  offers: DemoOffer[];
};

const PRODUCTS: DemoProduct[] = [
  { name: "Polotučné mlieko 1,5 %", brand: "Rajo", category: "mlieko", unit: "l", unitSize: "1 l", offers: [{ chain: "tesco", price: 0.89, original: 1.19 }, { chain: "billa", price: 0.95, original: 1.15 }] },
  { name: "Čerstvé mlieko plnotučné", brand: "Tami", category: "mlieko", unit: "l", unitSize: "1 l", offers: [{ chain: "kaufland", price: 1.05, original: 1.39 }] },
  { name: "Eidam plátky 45 %", brand: "Sabi", category: "syry", unit: "g", unitSize: "100 g", offers: [{ chain: "lidl", price: 1.19, original: 1.59 }] },
  { name: "Smotanový jogurt biely", brand: "Rajo", category: "jogurty", unit: "g", unitSize: "145 g", offers: [{ chain: "tesco", price: 0.39, original: 0.55 }, { chain: "coop-jednota", price: 0.45, original: 0.59 }] },
  { name: "Maslo 82 %", brand: "Rajo", category: "maslo-tuky", unit: "g", unitSize: "250 g", offers: [{ chain: "kaufland", price: 1.99, original: 2.79 }, { chain: "lidl", price: 2.09, original: 2.69 }] },
  { name: "Vajcia M čerstvé", category: "vajcia", unit: "ks", unitSize: "10 ks", offers: [{ chain: "billa", price: 2.49, original: 3.19 }] },
  { name: "Kuracie prsia chladené", category: "kuracie", unit: "kg", unitSize: "1 kg", offers: [{ chain: "kaufland", price: 5.49, original: 7.99 }, { chain: "tesco", price: 5.99, original: 7.49 }] },
  { name: "Bravčové karé bez kosti", category: "bravcove", unit: "kg", unitSize: "1 kg", offers: [{ chain: "lidl", price: 4.29, original: 5.99 }] },
  { name: "Šunková saláma", brand: "Sabi", category: "udeniny", unit: "g", unitSize: "100 g", offers: [{ chain: "coop-jednota", price: 0.99, original: 1.35 }] },
  { name: "Losos filety mrazené", category: "ryby", unit: "g", unitSize: "250 g", offers: [{ chain: "kaufland", price: 4.99, original: 6.49 }] },
  { name: "Chlieb pšenično-ražný", category: "chlieb", unit: "g", unitSize: "500 g", offers: [{ chain: "billa", price: 0.99, original: 1.49 }] },
  { name: "Bagety svetlé", category: "rozky-bagety", unit: "ks", unitSize: "2 ks", offers: [{ chain: "lidl", price: 0.55, original: 0.79 }] },
  { name: "Špagety semolinové", category: "cestoviny", unit: "g", unitSize: "500 g", offers: [{ chain: "tesco", price: 0.85, original: 1.19 }, { chain: "kaufland", price: 0.89, original: 1.15 }] },
  { name: "Ryža guľatozrnná", category: "ryza-strukoviny", unit: "kg", unitSize: "1 kg", offers: [{ chain: "coop-jednota", price: 1.59, original: 2.09 }] },
  { name: "Slnečnicový olej", brand: "Palma", category: "olej-ocot", unit: "l", unitSize: "1 l", offers: [{ chain: "kaufland", price: 1.49, original: 2.19 }, { chain: "terno", price: 1.55, original: 2.09 }] },
  { name: "Polohrubá múka", brand: "Babička Ruža", category: "muka-cukor", unit: "kg", unitSize: "1 kg", offers: [{ chain: "billa", price: 0.65, original: 0.99 }] },
  { name: "Mletá čokoláda na varenie", brand: "Orion", category: "cokolady", unit: "g", unitSize: "100 g", offers: [{ chain: "tesco", price: 1.09, original: 1.49 }] },
  { name: "Horalky arašidové", brand: "Sedita", category: "susienky", unit: "g", unitSize: "50 g", offers: [{ chain: "coop-jednota", price: 0.29, original: 0.45 }, { chain: "kaufland", price: 0.33, original: 0.42 }] },
  { name: "Čokoláda mliečna", brand: "Milka", category: "cokolady", unit: "g", unitSize: "100 g", offers: [{ chain: "lidl", price: 0.89, original: 1.35 }, { chain: "tesco", price: 0.95, original: 1.29 }] },
  { name: "Zemiakové čipsy solené", category: "cipsy-slane", unit: "g", unitSize: "150 g", offers: [{ chain: "billa", price: 1.19, original: 1.79 }] },
  { name: "Prírodná minerálna voda nesýtená", brand: "Budiš", category: "voda", unit: "l", unitSize: "1,5 l", offers: [{ chain: "tesco", price: 0.39, original: 0.59 }, { chain: "terno", price: 0.42, original: 0.55 }] },
  { name: "Kofola Originál", brand: "Kofola", category: "dzusy-limonady", unit: "l", unitSize: "2 l", offers: [{ chain: "kaufland", price: 1.29, original: 1.89 }, { chain: "coop-jednota", price: 1.39, original: 1.85 }] },
  { name: "Coca-Cola", brand: "Coca-Cola", category: "dzusy-limonady", unit: "l", unitSize: "1,75 l", offers: [{ chain: "billa", price: 1.49, original: 2.15 }] },
  { name: "Energetický nápoj", brand: "Monster Energy", category: "energeticke-napoje", unit: "ml", unitSize: "500 ml", offers: [{ chain: "tesco", price: 0.99, original: 1.55 }, { chain: "lidl", price: 1.05, original: 1.49 }] },
  { name: "Energetický nápoj", brand: "Red Bull", category: "energeticke-napoje", unit: "ml", unitSize: "250 ml", offers: [{ chain: "kaufland", price: 0.89, original: 1.29 }] },
  { name: "Zrnková káva Crema", brand: "Figaro", category: "kava-caj", unit: "kg", unitSize: "500 g", offers: [{ chain: "lidl", price: 5.99, original: 8.49 }] },
  { name: "Pivo svetlý ležiak 12°", brand: "Zlatý Bažant", category: "pivo", unit: "l", unitSize: "0,5 l", offers: [{ chain: "tesco", price: 0.65, original: 0.95 }, { chain: "coop-jednota", price: 0.69, original: 0.92 }] },
  { name: "Vanilková zmrzlina", category: "zmrzlina", unit: "ml", unitSize: "900 ml", offers: [{ chain: "kaufland", price: 1.79, original: 2.59 }] },
  { name: "Mrazený hrášok", category: "mrazena-zelenina", unit: "g", unitSize: "450 g", attributes: { vegan: true }, offers: [{ chain: "billa", price: 0.99, original: 1.39 }] },
  { name: "Proteínový puding čokoládový", brand: "Müller", category: "proteinove", unit: "g", unitSize: "200 g", offers: [{ chain: "lidl", price: 0.85, original: 1.19 }] },
  { name: "Bio banány", category: "ovocie", unit: "kg", unitSize: "1 kg", attributes: { bio: true }, offers: [{ chain: "kaufland", price: 1.49, original: 1.99 }] },
  { name: "Rajčiny cherry", category: "zelenina", unit: "g", unitSize: "250 g", offers: [{ chain: "lidl", price: 0.79, original: 1.29 }] },
  { name: "Prací gél Color", brand: "Persil", category: "pranie-cistenie", unit: "l", unitSize: "3,5 l", offers: [{ chain: "tesco", price: 9.99, original: 15.99 }] },
  { name: "Sprchový gél", brand: "Nivea", category: "osobna-hygiena", unit: "ml", unitSize: "250 ml", offers: [{ chain: "billa", price: 1.79, original: 2.69 }] },
  { name: "Granule pre psov hovädzie", category: "krmivo-psy", unit: "kg", unitSize: "3 kg", offers: [{ chain: "kaufland", price: 4.49, original: 6.29 }] },
  { name: "Detská výživa jablková", category: "detska-vyziva", unit: "g", unitSize: "190 g", offers: [{ chain: "coop-jednota", price: 0.69, original: 0.95 }] },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const country = await prisma.country.findUniqueOrThrow({ where: { code: "SK" } });
  const chains = await prisma.chain.findMany();
  const chainBySlug = new Map(chains.map((c) => [c.slug, c]));

  // Leaflet validity: Thursday of this week → Wednesday next week
  const now = new Date();
  const validFrom = new Date(now);
  validFrom.setDate(now.getDate() - 3);
  const validTo = new Date(now);
  validTo.setDate(now.getDate() + 4);

  // One published leaflet per chain that has offers
  const chainSlugsWithOffers = [...new Set(PRODUCTS.flatMap((p) => p.offers.map((o) => o.chain)))];
  const leafletByChain = new Map<string, string>();

  for (const chainSlug of chainSlugsWithOffers) {
    const chain = chainBySlug.get(chainSlug);
    if (!chain) continue;
    const title = `${chain.name} — akciový leták`;
    const existing = await prisma.leaflet.findFirst({
      where: { chainId: chain.id, title, validFrom },
    });
    const leaflet =
      existing ??
      (await prisma.leaflet.create({
        data: {
          chainId: chain.id,
          countryId: country.id,
          title,
          pdfUrl: "",
          pageCount: 0,
          validFrom,
          validTo,
          status: "PUBLISHED",
          publishedAt: now,
        },
      }));
    leafletByChain.set(chainSlug, leaflet.id);
  }

  let offerCount = 0;
  for (const item of PRODUCTS) {
    const category = await prisma.category.findUnique({ where: { slug: item.category } });
    const brand = item.brand
      ? await prisma.brand.findUnique({ where: { slug: slugify(item.brand) } })
      : null;

    const fullName =
      item.brand && !item.name.startsWith(item.brand)
        ? `${item.brand} ${item.name}`
        : item.name;
    const slug = slugify(`${fullName} ${item.unitSize ?? ""}`);

    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: fullName,
        normalizedName: fullName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, ""),
        brandId: brand?.id,
        categoryId: category?.id,
        countryId: country.id,
        unit: item.unit,
        unitSize: item.unitSize,
        attributes: item.attributes ?? undefined,
      },
    });

    for (const o of item.offers) {
      const chain = chainBySlug.get(o.chain);
      if (!chain) continue;

      const discountPct = o.original
        ? Math.round((1 - o.price / o.original) * 100)
        : null;

      const existing = await prisma.offer.findFirst({
        where: { productId: product.id, chainId: chain.id, validFrom },
      });
      if (existing) continue;

      const offer = await prisma.offer.create({
        data: {
          productId: product.id,
          chainId: chain.id,
          leafletId: leafletByChain.get(o.chain),
          price: o.price,
          originalPrice: o.original,
          discountPct,
          validFrom,
          validTo,
          conditions: o.conditions,
          source: "MANUAL",
          status: "PUBLISHED",
        },
      });
      await prisma.priceHistory.create({
        data: {
          productId: product.id,
          chainId: chain.id,
          offerId: offer.id,
          price: o.price,
          originalPrice: o.original,
          discountPct,
        },
      });
      offerCount++;
    }
  }

  console.log(
    `Demo data ready: ${PRODUCTS.length} products, ${offerCount} new offers, ${leafletByChain.size} leaflets`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
