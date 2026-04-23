import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";
import type {
  FactCategory,
  SourceImportance,
  SourceReliability,
} from "@/generated/prisma/enums";

async function assertProject(id: string, tenantId: string) {
  return prisma.project.findFirst({
    where: { id, tenantId },
    select: { id: true, settingsJson: true },
  });
}

const CAT: FactCategory[] = ["solido", "interpretazione", "memoria", "ipotesi"];
const IMP: SourceImportance[] = ["primaria", "secondaria", "contesto"];
const REL: SourceReliability[] = ["alta", "media", "bassa"];

interface ClientFact {
  id: string;
  content: string;
  category: string;
  importance: string;
  reliability: string;
  poiRef?: number | null;
  sourceRef: {
    kind: string;
    id?: string;
    label?: string;
  };
  approved: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// KB: facts → KBFact table; sourceRef kind/label → tags JSON-ish in memoria.
// Metadati client (lastExtractedAt, extractedSignature) in Project.settingsJson.kbMeta.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    const p = await assertProject(id, user.tenantId);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const facts = await prisma.kBFact.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "asc" },
    });
    const settings = (p.settingsJson as Record<string, unknown> | null) ?? {};
    const meta =
      (settings.kbMeta as Record<string, unknown> | null) ?? ({} as const);

    return NextResponse.json({
      kb: {
        facts: facts.map((f) => {
          const sourceRef = decodeSourceRef(f.tags);
          return {
            id: f.id,
            content: f.content,
            category: f.category,
            importance: f.importance,
            reliability: f.reliability,
            poiRef: f.poiRef ?? undefined,
            sourceRef,
            approved: f.approved,
            createdAt: f.createdAt.toISOString(),
            updatedAt: f.updatedAt.toISOString(),
          };
        }),
        lastExtractedAt: meta.lastExtractedAt,
        extractedSignature: meta.extractedSignature,
      },
    });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api kb GET]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const p = await assertProject(id, user.tenantId);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json();
    const facts: ClientFact[] = Array.isArray(body?.facts) ? body.facts : [];
    const lastExtractedAt =
      typeof body?.lastExtractedAt === "string"
        ? body.lastExtractedAt
        : undefined;
    const extractedSignature =
      typeof body?.extractedSignature === "string"
        ? body.extractedSignature
        : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.kBFact.deleteMany({ where: { projectId: id } });
      for (const f of facts) {
        await tx.kBFact.create({
          data: {
            id: f.id,
            projectId: id,
            category: (CAT.includes(f.category as FactCategory)
              ? f.category
              : "solido") as FactCategory,
            content: f.content,
            importance: (IMP.includes(f.importance as SourceImportance)
              ? f.importance
              : "secondaria") as SourceImportance,
            reliability: (REL.includes(f.reliability as SourceReliability)
              ? f.reliability
              : "media") as SourceReliability,
            poiRef: f.poiRef ?? null,
            approved: !!f.approved,
            tags: encodeSourceRef(f.sourceRef),
          },
        });
      }
      const existing = (p.settingsJson as Record<string, unknown> | null) ?? {};
      const existingMeta =
        (existing.kbMeta as Record<string, unknown> | null) ?? {};
      await tx.project.update({
        where: { id },
        data: {
          settingsJson: {
            ...existing,
            kbMeta: {
              ...existingMeta,
              lastExtractedAt: lastExtractedAt ?? existingMeta.lastExtractedAt,
              extractedSignature:
                extractedSignature ?? existingMeta.extractedSignature,
            },
          },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api kb PUT]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

// Codifica sourceRef in tags array: [kind, id?, label?]
function encodeSourceRef(r: ClientFact["sourceRef"]): string[] {
  const out = [`kind:${r.kind}`];
  if (r.id) out.push(`id:${r.id}`);
  if (r.label) out.push(`label:${r.label}`);
  return out;
}

function decodeSourceRef(tags: string[]): ClientFact["sourceRef"] {
  let kind = "manuale";
  let id: string | undefined;
  let label: string | undefined;
  for (const t of tags) {
    if (t.startsWith("kind:")) kind = t.slice(5);
    else if (t.startsWith("id:")) id = t.slice(3);
    else if (t.startsWith("label:")) label = t.slice(6);
  }
  return { kind, id, label };
}
