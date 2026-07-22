/**
 * Demo store locations for the map (a representative sample per chain,
 * Bratislava + Košice + regional cities). Real store data can be imported
 * later from chains' public store locators.
 * Run with: npx tsx prisma/seed-stores.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const STORES: {
  chain: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
}[] = [
  { chain: "tesco", name: "Tesco Extra Petržalka", address: "Panónska cesta 25", city: "Bratislava", lat: 48.1069, lng: 17.1103 },
  { chain: "tesco", name: "Tesco Lamač", address: "Lamačská cesta 1C", city: "Bratislava", lat: 48.1855, lng: 17.0526 },
  { chain: "tesco", name: "Tesco Košice Trolejbusová", address: "Trolejbusová 1", city: "Košice", lat: 48.7089, lng: 21.2681 },
  { chain: "lidl", name: "Lidl Ružinov", address: "Ružinovská 1E", city: "Bratislava", lat: 48.1531, lng: 17.1547 },
  { chain: "lidl", name: "Lidl Nitra Chrenová", address: "Fatranská 12", city: "Nitra", lat: 48.3033, lng: 18.0989 },
  { chain: "lidl", name: "Lidl Žilina Vlčince", address: "Obchodná 1", city: "Žilina", lat: 49.2194, lng: 18.7561 },
  { chain: "kaufland", name: "Kaufland Trnavská", address: "Trnavská cesta 41/A", city: "Bratislava", lat: 48.1662, lng: 17.1567 },
  { chain: "kaufland", name: "Kaufland Banská Bystrica", address: "Zvolenská cesta 8", city: "Banská Bystrica", lat: 48.7164, lng: 19.1372 },
  { chain: "billa", name: "Billa Karlova Ves", address: "Karloveská 34", city: "Bratislava", lat: 48.1583, lng: 17.0553 },
  { chain: "billa", name: "Billa Trenčín", address: "Gen. M. R. Štefánika 2", city: "Trenčín", lat: 48.8936, lng: 18.0403 },
  { chain: "coop-jednota", name: "COOP Jednota Prešov", address: "Hlavná 79", city: "Prešov", lat: 48.9986, lng: 21.2394 },
  { chain: "coop-jednota", name: "COOP Jednota Martin", address: "M. R. Štefánika 34", city: "Martin", lat: 49.0664, lng: 18.9217 },
  { chain: "terno", name: "Terno Dúbravka", address: "M. Sch. Trnavského 8", city: "Bratislava", lat: 48.1789, lng: 17.0361 },
  { chain: "fresh", name: "Fresh Košice Hlavná", address: "Hlavná 111", city: "Košice", lat: 48.7247, lng: 21.2578 },
  { chain: "metro", name: "Metro Ivanka pri Dunaji", address: "Senecká cesta 1", city: "Ivanka pri Dunaji", lat: 48.1928, lng: 17.2564 },
  { chain: "biedronka", name: "Biedronka Čadca", address: "Slovanská cesta 1", city: "Čadca", lat: 49.4386, lng: 18.7894 },
];

async function main() {
  const country = await prisma.country.findUniqueOrThrow({ where: { code: "SK" } });
  let created = 0;
  for (const store of STORES) {
    const chain = await prisma.chain.findUnique({ where: { slug: store.chain } });
    if (!chain) continue;
    const existing = await prisma.store.findFirst({
      where: { chainId: chain.id, name: store.name },
    });
    if (existing) continue;
    await prisma.store.create({
      data: {
        chainId: chain.id,
        countryId: country.id,
        name: store.name,
        address: store.address,
        city: store.city,
        lat: store.lat,
        lng: store.lng,
      },
    });
    created++;
  }
  console.log(`Stores: +${created} (total sample ${STORES.length})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
