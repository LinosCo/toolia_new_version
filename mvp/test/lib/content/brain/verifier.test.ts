import { describe, it, expect } from "vitest";
import { verifyArtifact } from "@/lib/content/brain/verifier";
import type { ContentContext, GeneratedArtifact } from "@/lib/content/brain/types";

const baseCtx: ContentContext = {
  facts: [],
  brand: null,
  tension: {
    mustTell: [{ title: "Affresco incompiuto", why: "x" }],
    avoid: [{ topic: "prezzi", reason: "y" }],
    verify: [],
  },
  lens: null,
  narrator: null,
  brief: null,
};

describe("verifyArtifact", () => {
  it("passes when mustTell covered and no avoid violation", () => {
    const art: GeneratedArtifact = { title: "T", body: "Parliamo dell'affresco incompiuto della sala." };
    const r = verifyArtifact(art, baseCtx);
    expect(r.passed).toBe(true);
    expect(r.mustTellCovered).toContain("Affresco incompiuto");
    expect(r.mustTellMissing).toHaveLength(0);
  });

  it("fails when a mustTell is missing", () => {
    const art: GeneratedArtifact = { title: "T", body: "Un testo che non parla del tema chiave." };
    const r = verifyArtifact(art, baseCtx);
    expect(r.passed).toBe(false);
    expect(r.mustTellMissing).toContain("Affresco incompiuto");
  });

  it("fails when an avoid topic appears", () => {
    const art: GeneratedArtifact = { title: "T", body: "Affresco incompiuto, e parliamo anche di prezzi." };
    const r = verifyArtifact(art, baseCtx);
    expect(r.passed).toBe(false);
    expect(r.avoidViolations).toContain("prezzi");
  });
});
