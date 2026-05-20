import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../../helpers/prisma";

vi.mock("@/lib/content/brain/context", () => ({ assembleContentContext: vi.fn() }));
vi.mock("@/lib/content/brain/planner", () => ({ planContent: vi.fn() }));
vi.mock("@/lib/content/brain/producers", () => ({ produceArtifact: vi.fn(), SUPPORTED_FORMATS: ["social_post"], BRAIN_PRODUCE_MODEL: "gpt-5.5" }));

import { assembleContentContext } from "@/lib/content/brain/context";
import { planContent } from "@/lib/content/brain/planner";
import { produceArtifact } from "@/lib/content/brain/producers";
import { generateContent } from "@/lib/content/brain/orchestrator";

const ctx = { facts: [], brand: null, tension: { mustTell: [{ title: "Affresco incompiuto", why: "x" }], avoid: [], verify: [] }, lens: null, narrator: null, brief: null };
const plan = { coreMessage: "m", angle: "a", structure: [], mustCover: ["Affresco incompiuto"], avoid: [], successCriterion: "s", citations: ["f1"] };

describe("generateContent", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); vi.mocked(assembleContentContext).mockResolvedValue(ctx as never); vi.mocked(planContent).mockResolvedValue(plan as never); });

  it("persists a ContentDraft when verification passes first try", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(produceArtifact).mockResolvedValue({ title: "T", body: "Affresco incompiuto della sala" });

    const res = await generateContent({ projectId: project.id, tenantId, format: "social_post", topic: "affresco" });

    expect(res.draft.title).toBe("T");
    expect(res.verification.passed).toBe(true);
    expect(produceArtifact).toHaveBeenCalledTimes(1);
    const stored = await prisma.contentDraft.findUnique({ where: { id: res.draft.id } });
    expect(stored?.body).toContain("Affresco");
  });

  it("retries production ONCE with critique when verification fails, then persists", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(produceArtifact)
      .mockResolvedValueOnce({ title: "T1", body: "testo senza il tema" })
      .mockResolvedValueOnce({ title: "T2", body: "ora con Affresco incompiuto" });

    const res = await generateContent({ projectId: project.id, tenantId, format: "social_post", topic: "affresco" });

    expect(produceArtifact).toHaveBeenCalledTimes(2);
    expect(vi.mocked(produceArtifact).mock.calls[1][3]).toBeTruthy(); // critique passed on retry (4th arg)
    expect(res.draft.body).toContain("Affresco");
    expect(res.verification.passed).toBe(true);
  });
});
