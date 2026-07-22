import { describe, expect, it } from "vitest";

import { daysLeft, formatPrice } from "@/lib/format";

describe("formatPrice", () => {
  it("formats EUR in Slovak locale", () => {
    // sk-SK uses comma decimal separator and trailing € with nbsp
    expect(formatPrice(0.89).replace(/ /g, " ")).toBe("0,89 €");
    expect(formatPrice("12.5").replace(/ /g, " ")).toBe("12,50 €");
  });

  it("accepts Prisma Decimal-like objects", () => {
    const decimalLike = { toNumber: () => 1.19 };
    expect(formatPrice(decimalLike)).toContain("1,19");
  });
});

describe("daysLeft", () => {
  it("returns 0 for past dates", () => {
    expect(daysLeft(new Date(Date.now() - 86_400_000))).toBe(0);
  });

  it("rounds up partial days", () => {
    expect(daysLeft(new Date(Date.now() + 1.5 * 86_400_000))).toBe(2);
  });
});
