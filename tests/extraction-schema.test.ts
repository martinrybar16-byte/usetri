import { describe, expect, it } from "vitest";

import { extractedItemSchema } from "@/server/services/extraction/schema";

describe("extractedItemSchema", () => {
  const base = { name: "Rajo Mlieko", price: 0.89, confidence: 0.9 };

  it("accepts a well-formed item", () => {
    const result = extractedItemSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("coerces European decimal strings ('0,89')", () => {
    const result = extractedItemSchema.parse({ ...base, price: "0,89" });
    expect(result.price).toBe(0.89);
  });

  it("coerces prices with currency suffix ('1.19 €')", () => {
    const result = extractedItemSchema.parse({ ...base, original_price: "1.19 €" });
    expect(result.original_price).toBe(1.19);
  });

  it("coerces percent strings ('-25%') to positive integers", () => {
    const result = extractedItemSchema.parse({ ...base, discount_pct: "-25%" });
    expect(result.discount_pct).toBe(25);
  });

  it("defaults missing confidence to 0.5", () => {
    const { confidence, ...withoutConfidence } = base;
    void confidence;
    const result = extractedItemSchema.parse(withoutConfidence);
    expect(result.confidence).toBe(0.5);
  });

  it("rejects zero/negative prices", () => {
    expect(extractedItemSchema.safeParse({ ...base, price: 0 }).success).toBe(false);
    expect(extractedItemSchema.safeParse({ ...base, price: "zadarmo" }).success).toBe(false);
  });

  it("rejects out-of-range bbox", () => {
    const result = extractedItemSchema.safeParse({
      ...base,
      bbox: { x: 1.5, y: 0, w: 0.2, h: 0.2 },
    });
    expect(result.success).toBe(false);
  });
});
