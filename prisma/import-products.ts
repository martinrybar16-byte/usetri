/**
 * Imports a base catalog of Slovak grocery products from Open Food Facts
 * (open data, ODbL — attribution required, which the product pages carry).
 *
 * Gives users a browsable catalog with real photos, brands and pack sizes so
 * they can add products to shopping lists even when nothing is on sale.
 * Leaflet-extracted offers then attach prices to these products over time.
 *
 * Usage:
 *   npx tsx prisma/import-products.ts --dry        # preview only
 *   npx tsx prisma/import-products.ts --pages=20   # ~2000 products
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const UA = "Usetri/1.0 (grocery discount platform; +https://usetri.vercel.app)";
const PAGE_SIZE = 100;

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_sk?: string;
  brands?: string;
  quantity?: string;
  image_front_small_url?: string;
  categories_tags?: string[];
};

/** OFF category tag fragments → our category slugs (first match wins). */
const CATEGORY_MAP: [RegExp, string][] = [
  // More specific dairy types first — OFF tags a yoghurt as "dairies" too.
  [/yogh?urts?|jogurt/i, "jogurty"],
  [/cheese|syr/i, "syry"],
  [/\bmilks?\b|mlieko/i, "mlieko"],
  [/butter|maslo|margarin/i, "maslo-tuky"],
  [/\beggs?\b|vajc/i, "vajcia"],
  [/chicken|kurac/i, "kuracie"],
  [/pork|bravc/i, "bravcove"],
  [/beef|hovadz/i, "hovadzie"],
  [/sausage|salami|udenin|klobas/i, "udeniny"],
  [/fish|seafood|ryb/i, "ryby"],
  [/bread|chlieb|chleb/i, "chlieb"],
  [/pastr|rozok|bagety|croissant/i, "rozky-bagety"],
  [/pasta|cestovin|spaghett/i, "cestoviny"],
  [/rice|legum|ryza|strukovin|beans/i, "ryza-strukoviny"],
  [/canned|konzerv/i, "konzervy"],
  [/oils?\b|vinegar|olej|ocot/i, "olej-ocot"],
  [/flour|sugar|muka|cukor/i, "muka-cukor"],
  [/sauce|spice|omack|korenin|ketchup/i, "omacky-korenie"],
  [/chocolat|cokolad/i, "cokolady"],
  [/biscuit|cookie|susienk|wafer|oplatk/i, "susienky"],
  [/chips|crisps|snack|slane/i, "cipsy-slane"],
  [/waters?\b|voda/i, "voda"],
  [/juice|soda|lemonade|dzus|limonad|cola/i, "dzusy-limonady"],
  [/coffee|teas?\b|kava|caj/i, "kava-caj"],
  [/energy.drink|energetick/i, "energeticke-napoje"],
  [/beers?\b|pivo/i, "pivo"],
  [/wines?\b|vino/i, "vino"],
  [/spirit|liquor|liehovin|vodka|whisk/i, "liehoviny"],
  [/frozen.veget|mrazena.zelenina/i, "mrazena-zelenina"],
  [/ice.cream|zmrzlin/i, "zmrzlina"],
  [/frozen|mrazen/i, "mrazene-jedla"],
  [/organic|\bbio\b/i, "bio"],
  [/protein/i, "proteinove"],
  [/gluten.free|bezlepk/i, "bezlepkove"],
  [/baby|detsk[aá].v[yý]ziva/i, "detska-vyziva"],
  [/fruits?\b|ovocie/i, "ovocie"],
  [/vegetables?\b|zelenin/i, "zelenina"],
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function slugify(text: string): string {
  return normalize(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90);
}

function mapCategory(tags: string[] | undefined): string | null {
  if (!tags?.length) return null;
  const joined = tags.join(" ");
  for (const [re, slug] of CATEGORY_MAP) if (re.test(joined)) return slug;
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** OFF rate-limits aggressively (503) — back off and retry before giving up. */
async function fetchPage(page: number, attempt = 1): Promise<OffProduct[]> {
  const url =
    `https://sk.openfoodfacts.org/api/v2/search` +
    `?fields=code,product_name,product_name_sk,brands,quantity,image_front_small_url,categories_tags` +
    `&page_size=${PAGE_SIZE}&page=${page}`;

  const res = await fetch(url, { headers: { "User-Agent": UA } });

  if (res.status === 503 || res.status === 429) {
    if (attempt > 4) throw new Error(`OFF ${res.status} after ${attempt} attempts`);
    const wait = 3000 * attempt;
    process.stdout.write(`\r  rate limited, waiting ${wait / 1000}s…            `);
    await sleep(wait);
    return fetchPage(page, attempt + 1);
  }
  if (!res.ok) throw new Error(`OFF ${res.status}`);

  const json = (await res.json()) as { products?: OffProduct[] };
  return json.products ?? [];
}

async function main() {
  const dryRun = process.argv.includes("--dry");
  const pagesArg = process.argv.find((a) => a.startsWith("--pages="));
  const pages = pagesArg ? Number(pagesArg.split("=")[1]) : 10;

  const country = await prisma.country.findUniqueOrThrow({ where: { code: "SK" } });
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  const existing = await prisma.product.findMany({ select: { slug: true, ean: true } });
  const seenSlugs = new Set(existing.map((p) => p.slug));
  const seenEans = new Set(existing.map((p) => p.ean).filter(Boolean) as string[]);

  let imported = 0;
  let skipped = 0;
  let withImage = 0;

  for (let page = 1; page <= pages; page++) {
    let batch: OffProduct[];
    try {
      batch = await fetchPage(page);
    } catch (e) {
      console.error(`  page ${page} failed: ${(e as Error).message}`);
      continue;
    }
    if (batch.length === 0) break;

    for (const p of batch) {
      const rawName = (p.product_name_sk || p.product_name || "").trim();
      if (rawName.length < 3 || rawName.length > 150) {
        skipped++;
        continue;
      }
      if (p.code && seenEans.has(p.code)) {
        skipped++;
        continue;
      }

      // Brands field can be a comma list — take the first
      const brandName = p.brands?.split(",")[0]?.trim() || null;
      const displayName =
        brandName && !normalize(rawName).includes(normalize(brandName))
          ? `${brandName} ${rawName}`
          : rawName;

      let slug = slugify(`${displayName} ${p.quantity ?? ""}`);
      if (!slug) {
        skipped++;
        continue;
      }
      if (seenSlugs.has(slug)) {
        if (!p.code) {
          skipped++;
          continue;
        }
        slug = `${slug}-${p.code.slice(-4)}`;
        if (seenSlugs.has(slug)) {
          skipped++;
          continue;
        }
      }
      seenSlugs.add(slug);
      if (p.code) seenEans.add(p.code);

      if (dryRun) {
        if (imported < 8) {
          console.log(
            `  ${displayName}${p.quantity ? ` (${p.quantity})` : ""}` +
              `${p.image_front_small_url ? " [img]" : ""}` +
              ` → ${mapCategory(p.categories_tags) ?? "—"}`
          );
        }
        imported++;
        if (p.image_front_small_url) withImage++;
        continue;
      }

      const brandId = brandName
        ? (
            await prisma.brand.upsert({
              where: { slug: slugify(brandName) },
              update: {},
              create: { slug: slugify(brandName), name: brandName },
            })
          ).id
        : null;

      const categorySlug = mapCategory(p.categories_tags);

      await prisma.product.create({
        data: {
          slug,
          name: displayName.slice(0, 150),
          normalizedName: normalize(displayName),
          brandId,
          categoryId: categorySlug ? (categoryBySlug.get(categorySlug) ?? null) : null,
          countryId: country.id,
          unitSize: p.quantity?.slice(0, 50) || null,
          ean: p.code || null,
          imageUrl: p.image_front_small_url || null,
          status: "ACTIVE",
        },
      });
      imported++;
      if (p.image_front_small_url) withImage++;
    }

    process.stdout.write(
      `\r  page ${page}/${pages} — imported ${imported}, skipped ${skipped}          `
    );
    // Be a good citizen with the free public API
    if (page < pages) await sleep(1500);
  }

  console.log(
    `\n${dryRun ? "[dry] " : ""}Imported ${imported} products (${withImage} with photos), skipped ${skipped}.`
  );
  if (!dryRun) console.log(`Products in DB: ${await prisma.product.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
