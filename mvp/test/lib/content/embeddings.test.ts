import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
vi.mock("openai", () => ({
  default: class {
    embeddings = { create: mockCreate };
  },
}));
vi.mock("@/lib/tenant-keys", () => ({ getTenantApiKey: vi.fn() }));
vi.mock("@/lib/llm-usage", () => ({ logLlmCall: vi.fn() }));

import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";
import { createEmbeddings, EMBEDDING_MODEL, EMBEDDING_DIM } from "@/lib/content/embeddings";

describe("createEmbeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantApiKey).mockResolvedValue("sk-test");
  });

  it("embeds inputs and logs usage", async () => {
    mockCreate.mockResolvedValue({
      data: [{ embedding: new Array(EMBEDDING_DIM).fill(0.1) }],
      usage: { prompt_tokens: 42, total_tokens: 42 },
    });

    const out = await createEmbeddings(["ciao"], {
      tenantId: "t1", projectId: "p1", operation: "content_embed",
    });

    expect(out).toHaveLength(1);
    expect(out[0]).toHaveLength(EMBEDDING_DIM);
    expect(mockCreate).toHaveBeenCalledWith({ model: EMBEDDING_MODEL, input: ["ciao"] });
    expect(logLlmCall).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "t1", projectId: "p1", provider: "openai", model: EMBEDDING_MODEL, inputTokens: 42 }),
    );
  });

  it("throws a clear error when no API key", async () => {
    vi.mocked(getTenantApiKey).mockResolvedValue(null);
    await expect(
      createEmbeddings(["x"], { tenantId: "t1", projectId: "p1", operation: "content_embed" }),
    ).rejects.toThrow("OpenAI API key non configurata");
  });

  it("returns [] for empty input without calling the API", async () => {
    const out = await createEmbeddings([], { tenantId: "t1", projectId: "p1", operation: "content_embed" });
    expect(out).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
