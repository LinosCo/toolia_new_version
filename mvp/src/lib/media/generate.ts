import OpenAI, { toFile } from "openai";
import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";
import { checkIdentityPreservation } from "@/lib/media/identity-check";

type Mode = "GENERATION" | "PRESERVATION_EDIT" | "STYLE_TRANSFER" | "LAYOUT";

// Cascade modelli — verificare id contro modelli-ai-reference. Premium (Flux/Gemini) = follow-up (nuovi provider).
export const GEN_MODELS = ["gpt-image-2", "dall-e-3"];
export const EDIT_MODELS = ["gpt-image-2"];

export interface GenerateArgs {
  tenantId: string;
  projectId: string;
  mode: Mode;
  prompt?: string;
  sourceUrl?: string;
}

export interface GenerateResult {
  outputUrl: string | null;
  model: string | null;
  status: "ready" | "rejected" | "failed";
  identityPassed?: boolean;
  identityScore?: number;
  identityNotes?: string;
  error?: string;
}

function dataUrl(b64: string): string {
  return `data:image/png;base64,${b64}`;
}

function dataUrlToBuffer(url: string): Buffer {
  const b64 = url.includes(",") ? url.split(",")[1] : url;
  return Buffer.from(b64, "base64");
}

export async function generateMedia(args: GenerateArgs): Promise<GenerateResult> {
  const apiKey = await getTenantApiKey(args.tenantId, "openai");
  if (!apiKey) throw new Error("OpenAI API key non configurata per il tenant");
  const client = new OpenAI({ apiKey });

  if (args.mode === "STYLE_TRANSFER" || args.mode === "LAYOUT") {
    return { outputUrl: null, model: null, status: "failed", error: "mode_not_yet_supported" };
  }

  if (args.mode === "PRESERVATION_EDIT" && !args.sourceUrl) {
    throw new Error("PRESERVATION_EDIT richiede sourceUrl");
  }

  if (args.mode === "GENERATION") {
    let lastErr: unknown;
    for (const model of GEN_MODELS) {
      try {
        const res = await client.images.generate({ model, prompt: args.prompt ?? "", size: "1024x1024" } as never);
        const b64 = res.data?.[0]?.b64_json;
        if (!b64) throw new Error("no_image");
        await logLlmCall({
          tenantId: args.tenantId,
          projectId: args.projectId,
          operation: "media_generate",
          provider: "openai",
          model,
        });
        return { outputUrl: dataUrl(b64), model, status: "ready" };
      } catch (e) {
        lastErr = e;
      }
    }
    return {
      outputUrl: null,
      model: null,
      status: "failed",
      error: lastErr instanceof Error ? lastErr.message : "generation_failed",
    };
  }

  // PRESERVATION_EDIT
  let lastErr: unknown;
  for (const model of EDIT_MODELS) {
    try {
      const file = await toFile(dataUrlToBuffer(args.sourceUrl!), "source.png", { type: "image/png" });
      const res = await client.images.edit({ model, image: file, prompt: args.prompt ?? "" } as never);
      const b64 = res.data?.[0]?.b64_json;
      if (!b64) throw new Error("no_image");
      const outputUrl = dataUrl(b64);
      await logLlmCall({
        tenantId: args.tenantId,
        projectId: args.projectId,
        operation: "media_edit",
        provider: "openai",
        model,
      });

      const identity = await checkIdentityPreservation({
        tenantId: args.tenantId,
        projectId: args.projectId,
        sourceUrl: args.sourceUrl!,
        outputUrl,
      });

      return {
        outputUrl,
        model,
        status: identity.passed ? "ready" : "rejected",
        identityPassed: identity.passed,
        identityScore: identity.confidence,
        identityNotes: identity.notes,
      };
    } catch (e) {
      lastErr = e;
    }
  }

  return {
    outputUrl: null,
    model: null,
    status: "failed",
    error: lastErr instanceof Error ? lastErr.message : "edit_failed",
  };
}
