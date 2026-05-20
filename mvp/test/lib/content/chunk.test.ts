import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/content/chunk";

describe("chunkText", () => {
  it("returns one chunk for short text", () => {
    const out = chunkText("ciao mondo", { size: 100, overlap: 10 });
    expect(out).toEqual(["ciao mondo"]);
  });

  it("returns empty array for empty/whitespace input", () => {
    expect(chunkText("   ", { size: 100, overlap: 10 })).toEqual([]);
  });

  it("splits long text into overlapping chunks", () => {
    const text = "a".repeat(250);
    const out = chunkText(text, { size: 100, overlap: 20 });
    // step = size - overlap = 80 → chunks start at 0,80,160,240
    expect(out.length).toBe(4);
    expect(out[0].length).toBe(100);
    expect(out[3]).toBe("a".repeat(10)); // tail
  });

  it("does not produce empty trailing chunk when text divides evenly", () => {
    const text = "a".repeat(80);
    const out = chunkText(text, { size: 100, overlap: 20 });
    expect(out).toEqual([text]);
  });
});
