import { z } from "zod";

/**
 * Contract between the vision model and the pipeline. Every model response
 * is validated against this — anything that doesn't parse is retried once
 * and then dropped with a log entry.
 */

/** Coerces "0,89", "1.19 €", "-25%" style strings into numbers. */
function looseNumber(inner: z.ZodType<number>) {
  return z.preprocess((v) => {
    if (typeof v === "string") {
      const cleaned = v.replace(",", ".").replace(/[^\d.\-]/g, "");
      const n = Number(cleaned);
      return Number.isFinite(n) ? Math.abs(n) : v;
    }
    return typeof v === "number" ? Math.abs(v) : v;
  }, inner);
}

export const extractedItemSchema = z.object({
  name: z.string().min(2).max(200),
  brand: z.string().max(100).nullish(),
  unit_size: z.string().max(50).nullish(), // "1 l", "500 g", "4×100 g"
  price: looseNumber(z.number().positive().max(10000)),
  original_price: looseNumber(z.number().positive().max(10000)).nullish(),
  discount_pct: looseNumber(z.number().int().min(1).max(99)).nullish(),
  conditions: z.string().max(200).nullish(), // "len s Clubcard", "pri kúpe 2 ks"
  category_guess: z.string().max(100).nullish(),
  flags: z
    .object({
      bio: z.boolean().optional(),
      vegan: z.boolean().optional(),
      glutenFree: z.boolean().optional(),
      lactoseFree: z.boolean().optional(),
    })
    .nullish(),
  // Bounding box of the product tile, relative 0–1 coordinates on the page
  bbox: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      w: z.number().min(0).max(1),
      h: z.number().min(0).max(1),
    })
    .nullish(),
  confidence: looseNumber(z.number().min(0).max(1)).default(0.5),
});

export const extractionResponseSchema = z.object({
  items: z.array(extractedItemSchema),
});

export type ExtractedItemRaw = z.infer<typeof extractedItemSchema>;
