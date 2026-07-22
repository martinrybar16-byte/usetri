import { describe, expect, it } from "vitest";

import { normalizeQuery } from "@/server/services/search";

describe("normalizeQuery", () => {
  it("removes Slovak diacritics", () => {
    expect(normalizeQuery("Čokoláda mliečna")).toBe("cokolada mliecna");
    expect(normalizeQuery("Ušetri")).toBe("usetri");
  });

  it("lowercases and trims", () => {
    expect(normalizeQuery("  MLIEKO  ")).toBe("mlieko");
  });

  it("caps length at 100 characters", () => {
    expect(normalizeQuery("a".repeat(300))).toHaveLength(100);
  });
});
