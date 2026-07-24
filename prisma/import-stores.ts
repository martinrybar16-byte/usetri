/**
 * Imports real store locations for all supported chains from OpenStreetMap
 * (Overpass API). Free, legal (ODbL — attribution shown on the map), and
 * covers ~2600 Slovak grocery stores.
 *
 * Usage: npx tsx prisma/import-stores.ts [--dry]
 * Re-runnable: matches existing stores by OSM id stored in the name suffix
 * is avoided — we dedupe on (chainId, lat, lng) rounded to ~11 m.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const OVERPASS = "https://overpass-api.de/api/interpreter";
const UA = "Usetri/1.0 (grocery discount platform; +https://usetri.vercel.app)";

/** chain slug → regex matched against brand/name/operator tags */
const CHAIN_PATTERNS: Record<string, RegExp> = {
  tesco: /\btesco\b/i,
  lidl: /\blidl\b/i,
  kaufland: /\bkaufland\b/i,
  billa: /\bbilla\b/i,
  "coop-jednota": /\bcoop\b|\bjednota\b/i,
  terno: /\bterno\b/i,
  fresh: /\bfresh\b/i,
  metro: /\bmetro\b/i,
  biedronka: /\bbiedronka\b/i,
};

type OsmElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const QUERY = `[out:json][timeout:180];
area["ISO3166-1"="SK"]->.sk;
(
  node["shop"~"supermarket|convenience|discount|department_store|greengrocer"](area.sk);
  way["shop"~"supermarket|convenience|discount|department_store|greengrocer"](area.sk);
);
out center tags;`;

async function fetchOsm(): Promise<OsmElement[]> {
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: QUERY }),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { elements: OsmElement[] };
  return json.elements ?? [];
}

function matchChain(tags: Record<string, string>): string | null {
  const label = [tags.brand, tags.name, tags.operator].filter(Boolean).join(" ");
  if (!label) return null;
  for (const [slug, re] of Object.entries(CHAIN_PATTERNS)) {
    if (re.test(label)) return slug;
  }
  return null;
}

/** OSM opening_hours string → our JSON shape (kept raw; it's a standard format). */
function openingHours(tags: Record<string, string>): object | undefined {
  return tags.opening_hours ? { raw: tags.opening_hours } : undefined;
}

function buildAddress(tags: Record<string, string>): string {
  const street = tags["addr:street"] ?? "";
  const num = tags["addr:housenumber"] ?? "";
  const joined = [street, num].filter(Boolean).join(" ").trim();
  return joined || tags["addr:place"] || "—";
}

async function main() {
  const dryRun = process.argv.includes("--dry");

  console.log("Fetching stores from OpenStreetMap…");
  const elements = await fetchOsm();
  console.log(`  ${elements.length} shops in Slovakia`);

  const country = await prisma.country.findUniqueOrThrow({ where: { code: "SK" } });
  const chains = await prisma.chain.findMany();
  const chainBySlug = new Map(chains.map((c) => [c.slug, c]));

  // Existing stores keyed by chain + rounded coords, to stay idempotent
  const existing = await prisma.store.findMany({
    select: { id: true, chainId: true, lat: true, lng: true },
  });
  const key = (chainId: string, lat: number, lng: number) =>
    `${chainId}:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  const seen = new Set(existing.map((s) => key(s.chainId, s.lat, s.lng)));

  const toCreate: {
    chainId: string;
    countryId: string;
    name: string;
    address: string;
    city: string;
    postalCode: string | null;
    lat: number;
    lng: number;
    openingHours: object | undefined;
    phone: string | null;
  }[] = [];

  const perChain: Record<string, number> = {};

  for (const el of elements) {
    const tags = el.tags;
    if (!tags) continue;
    const slug = matchChain(tags);
    if (!slug) continue;

    const chain = chainBySlug.get(slug);
    if (!chain) continue;

    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;

    const k = key(chain.id, lat, lng);
    if (seen.has(k)) continue;
    seen.add(k);

    const city = tags["addr:city"] ?? tags["addr:suburb"] ?? tags["addr:place"] ?? "—";

    toCreate.push({
      chainId: chain.id,
      countryId: country.id,
      name: tags.name?.slice(0, 120) ?? `${chain.name} ${city}`,
      address: buildAddress(tags).slice(0, 200),
      city: city.slice(0, 100),
      postalCode: tags["addr:postcode"] ?? null,
      lat,
      lng,
      openingHours: openingHours(tags),
      phone: tags.phone ?? tags["contact:phone"] ?? null,
    });
    perChain[slug] = (perChain[slug] ?? 0) + 1;
  }

  console.log("\nNew stores to import:");
  for (const [slug, n] of Object.entries(perChain).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${slug}: ${n}`);
  }
  console.log(`  TOTAL: ${toCreate.length}`);

  if (dryRun) {
    console.log("\n--dry: nothing written.");
    return;
  }

  // Chunked inserts keep the pooled connection happy
  const CHUNK = 200;
  let written = 0;
  for (let i = 0; i < toCreate.length; i += CHUNK) {
    const batch = toCreate.slice(i, i + CHUNK);
    await prisma.store.createMany({ data: batch });
    written += batch.length;
    process.stdout.write(`\r  written ${written}/${toCreate.length}`);
  }
  console.log(`\nDone. Stores in DB: ${await prisma.store.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
