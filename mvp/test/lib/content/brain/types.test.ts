import { describe, it, expect } from "vitest";
import { contentPlanSchema } from "@/lib/content/brain/types";

describe("contentPlanSchema", () => {
  it("accepts a valid plan", () => {
    const r = contentPlanSchema.safeParse({
      coreMessage: "msg", angle: "angolo", structure: ["intro", "corpo"],
      mustCover: ["fatto A"], avoid: ["tema X"], successCriterion: "chiarezza", citations: ["e1"],
    });
    expect(r.success).toBe(true);
  });
  it("defaults citations to [] and requires coreMessage", () => {
    const r = contentPlanSchema.safeParse({ coreMessage: "m", angle: "a", structure: [], mustCover: [], avoid: [], successCriterion: "s" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.citations).toEqual([]);
  });
  it("rejects missing coreMessage", () => {
    expect(contentPlanSchema.safeParse({ angle: "a" }).success).toBe(false);
  });
});
