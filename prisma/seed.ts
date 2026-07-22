/**
 * Seed data: Slovakia, retail chains, category tree, sample brands.
 * Run with: npm run db:seed
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const CHAINS = [
  { slug: "tesco", name: "Tesco", color: "#00539F", website: "https://tesco.sk" },
  { slug: "lidl", name: "Lidl", color: "#0050AA", website: "https://lidl.sk" },
  { slug: "kaufland", name: "Kaufland", color: "#E10915", website: "https://kaufland.sk" },
  { slug: "billa", name: "Billa", color: "#FFD500", website: "https://billa.sk" },
  { slug: "coop-jednota", name: "COOP Jednota", color: "#E30613", website: "https://coop.sk" },
  { slug: "terno", name: "Terno", color: "#D71920", website: "https://terno.sk" },
  { slug: "fresh", name: "Fresh", color: "#6CB33F", website: "https://fresh.sk" },
  { slug: "metro", name: "Metro", color: "#002D72", website: "https://metro.sk" },
  { slug: "biedronka", name: "Biedronka", color: "#D3001C", website: "https://biedronka.sk" },
];

const CATEGORIES: { slug: string; name: string; icon: string; children?: { slug: string; name: string }[] }[] = [
  {
    slug: "ovocie-zelenina", name: "Ovocie a zelenina", icon: "🥦",
    children: [
      { slug: "ovocie", name: "Ovocie" },
      { slug: "zelenina", name: "Zelenina" },
    ],
  },
  {
    slug: "mliecne-vyrobky", name: "Mliečne výrobky a vajcia", icon: "🥛",
    children: [
      { slug: "mlieko", name: "Mlieko" },
      { slug: "syry", name: "Syry" },
      { slug: "jogurty", name: "Jogurty" },
      { slug: "maslo-tuky", name: "Maslo a tuky" },
      { slug: "vajcia", name: "Vajcia" },
    ],
  },
  {
    slug: "maso-ryby", name: "Mäso a ryby", icon: "🥩",
    children: [
      { slug: "kuracie", name: "Kuracie mäso" },
      { slug: "bravcove", name: "Bravčové mäso" },
      { slug: "hovadzie", name: "Hovädzie mäso" },
      { slug: "udeniny", name: "Údeniny a klobásy" },
      { slug: "ryby", name: "Ryby a morské plody" },
    ],
  },
  {
    slug: "pecivo", name: "Pečivo", icon: "🥖",
    children: [
      { slug: "chlieb", name: "Chlieb" },
      { slug: "rozky-bagety", name: "Rožky a bagety" },
      { slug: "sladke-pecivo", name: "Sladké pečivo" },
    ],
  },
  {
    slug: "trvanlive-potraviny", name: "Trvanlivé potraviny", icon: "🍝",
    children: [
      { slug: "cestoviny", name: "Cestoviny" },
      { slug: "ryza-strukoviny", name: "Ryža a strukoviny" },
      { slug: "konzervy", name: "Konzervy" },
      { slug: "olej-ocot", name: "Oleje a octy" },
      { slug: "muka-cukor", name: "Múka a cukor" },
      { slug: "omacky-korenie", name: "Omáčky a koreniny" },
    ],
  },
  {
    slug: "sladkosti-slane", name: "Sladkosti a slané", icon: "🍫",
    children: [
      { slug: "cokolady", name: "Čokolády" },
      { slug: "susienky", name: "Sušienky a keksy" },
      { slug: "cipsy-slane", name: "Čipsy a slané snacky" },
    ],
  },
  {
    slug: "napoje", name: "Nápoje", icon: "🥤",
    children: [
      { slug: "voda", name: "Voda" },
      { slug: "dzusy-limonady", name: "Džúsy a limonády" },
      { slug: "kava-caj", name: "Káva a čaj" },
      { slug: "energeticke-napoje", name: "Energetické nápoje" },
    ],
  },
  {
    slug: "alkohol", name: "Alkohol", icon: "🍺",
    children: [
      { slug: "pivo", name: "Pivo" },
      { slug: "vino", name: "Víno" },
      { slug: "liehoviny", name: "Liehoviny" },
    ],
  },
  {
    slug: "mrazene", name: "Mrazené potraviny", icon: "🧊",
    children: [
      { slug: "mrazena-zelenina", name: "Mrazená zelenina" },
      { slug: "zmrzlina", name: "Zmrzlina" },
      { slug: "mrazene-jedla", name: "Mrazené jedlá" },
    ],
  },
  {
    slug: "zdrava-vyziva", name: "Zdravá výživa", icon: "🌱",
    children: [
      { slug: "bio", name: "Bio potraviny" },
      { slug: "proteinove", name: "Proteínové výrobky" },
      { slug: "bezlepkove", name: "Bezlepkové" },
    ],
  },
  {
    slug: "drogeria", name: "Drogéria", icon: "🧴",
    children: [
      { slug: "pranie-cistenie", name: "Pranie a čistenie" },
      { slug: "osobna-hygiena", name: "Osobná hygiena" },
      { slug: "kozmetika", name: "Kozmetika" },
    ],
  },
  {
    slug: "deti", name: "Detský svet", icon: "🍼",
    children: [
      { slug: "detska-vyziva", name: "Detská výživa" },
      { slug: "plienky", name: "Plienky" },
    ],
  },
  {
    slug: "domace-zvierata", name: "Domáce zvieratá", icon: "🐕",
    children: [
      { slug: "krmivo-psy", name: "Krmivo pre psov" },
      { slug: "krmivo-macky", name: "Krmivo pre mačky" },
    ],
  },
  { slug: "domacnost", name: "Domácnosť", icon: "🏠" },
];

const BRANDS = [
  "Rajo", "Sabi", "Tami", "Agro Tami", "Coca-Cola", "Pepsi", "Kofola",
  "Monster Energy", "Red Bull", "Nivea", "Dove", "Persil", "Ariel", "Jar",
  "Milka", "Orion", "Figaro", "Sedita", "Horalky", "Nestlé", "Danone",
  "Müller", "Zlatý Bažant", "Šariš", "Corgoň", "Vinea", "Mattoni", "Budiš",
  "Zlatá Studňa", "Palma", "Vitana", "Knorr", "Dr. Oetker", "Babička Ruža",
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const slovakia = await prisma.country.upsert({
    where: { code: "SK" },
    update: {},
    create: {
      code: "SK",
      name: "Slovensko",
      currency: "EUR",
      defaultLocale: "sk",
    },
  });
  console.log(`Country: ${slovakia.name}`);

  for (const chain of CHAINS) {
    await prisma.chain.upsert({
      where: { slug: chain.slug },
      update: { name: chain.name, color: chain.color, website: chain.website },
      create: chain,
    });
  }
  console.log(`Chains: ${CHAINS.length}`);

  let categoryCount = 0;
  for (const [i, cat] of CATEGORIES.entries()) {
    const parent = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, sortOrder: i },
      create: { slug: cat.slug, name: cat.name, icon: cat.icon, sortOrder: i },
    });
    categoryCount++;
    for (const [j, child] of (cat.children ?? []).entries()) {
      await prisma.category.upsert({
        where: { slug: child.slug },
        update: { name: child.name, parentId: parent.id, sortOrder: j },
        create: { slug: child.slug, name: child.name, parentId: parent.id, sortOrder: j },
      });
      categoryCount++;
    }
  }
  console.log(`Categories: ${categoryCount}`);

  for (const name of BRANDS) {
    const slug = slugify(name);
    await prisma.brand.upsert({
      where: { slug },
      update: { name },
      create: { slug, name },
    });
  }
  console.log(`Brands: ${BRANDS.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
