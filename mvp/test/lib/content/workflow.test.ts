import { describe, it, expect } from "vitest";
import { allowedTransitions, canTransition } from "@/lib/content/workflow";

describe("content workflow state machine", () => {
  it("Editor can send draft -> in_review", () => {
    expect(canTransition("Editor", "draft", "in_review")).toBe(true);
  });
  it("Editor CANNOT publish from in_review (only Reviewer/Admin)", () => {
    expect(canTransition("Editor", "in_review", "published")).toBe(false);
    expect(canTransition("Reviewer", "in_review", "published")).toBe(true);
    expect(canTransition("Admin", "in_review", "published")).toBe(true);
  });
  it("ClientEditor can request changes (client_review -> in_review) but not publish", () => {
    expect(canTransition("ClientEditor", "client_review", "in_review")).toBe(true);
    expect(canTransition("ClientEditor", "client_review", "published")).toBe(false);
  });
  it("rejects non-existent transitions", () => {
    expect(canTransition("Admin", "draft", "published")).toBe(false);
    expect(canTransition("Admin", "published", "in_review")).toBe(false);
  });
  it("allowedTransitions returns role-filtered options with labels", () => {
    const opts = allowedTransitions("in_review", "Reviewer");
    const tos = opts.map((o) => o.to);
    expect(tos).toContain("published");
    expect(tos).toContain("client_review");
    expect(opts.every((o) => typeof o.label === "string" && o.label.length > 0)).toBe(true);
  });
  it("ClientViewer has no transitions", () => {
    expect(allowedTransitions("in_review", "ClientViewer")).toHaveLength(0);
  });
});
