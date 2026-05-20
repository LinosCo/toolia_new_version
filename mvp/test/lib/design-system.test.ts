import { describe, it, expect } from "vitest";
import { BRAND, GRADIENTS, PRODUCT_HUE } from "@/lib/design-system";

describe("design-system constants", () => {
  it("exposes CT brand colors", () => {
    expect(BRAND.primary).toContain("235");
    expect(BRAND.secondary).toContain("165");
  });
  it("gradient goes azzurro -> verde", () => {
    expect(GRADIENTS.primary).toContain("235");
    expect(GRADIENTS.primary).toContain("165");
  });
  it("maps a distinct hue per product", () => {
    expect(PRODUCT_HUE.contentTuner).toBe(235);
    expect(PRODUCT_HUE.businessTuner).not.toBe(PRODUCT_HUE.contentTuner);
  });
});
