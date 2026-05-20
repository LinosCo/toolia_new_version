import { describe, it, expect } from "vitest";
import { brandSkillManifestSchema } from "@/lib/brand/manifest";

describe("brandSkillManifestSchema", () => {
  it("accepts a sparse valid manifest", () => {
    const r = brandSkillManifestSchema.safeParse({
      palette: { primary: "#112233", citations: ["e1"] },
      tone: { descriptors: ["caldo", "autorevole"], citations: [] },
      summary: "Brand X",
    });
    expect(r.success).toBe(true);
  });

  it("accepts an empty manifest (all optional)", () => {
    expect(brandSkillManifestSchema.safeParse({}).success).toBe(true);
  });

  it("rejects wrong types", () => {
    const r = brandSkillManifestSchema.safeParse({ tone: { descriptors: "nope" } });
    expect(r.success).toBe(false);
  });
});
