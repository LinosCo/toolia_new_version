import { describe, it, expect } from "vitest";
import { normalizeZoneFunction } from "@/lib/project-store";

describe("normalizeZoneFunction", () => {
  it("maps 'closure' to 'chiusura', not 'sviluppo'", () => {
    expect(normalizeZoneFunction("closure")).toBe("chiusura");
  });
  it("maps 'chiusura' to itself", () => {
    expect(normalizeZoneFunction("chiusura")).toBe("chiusura");
  });
  it("maps 'apertura' to itself", () => {
    expect(normalizeZoneFunction("apertura")).toBe("apertura");
  });
});
