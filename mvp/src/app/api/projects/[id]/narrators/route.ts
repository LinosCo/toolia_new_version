import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";
import type { NarratorKind } from "@/generated/prisma/enums";

async function assertProject(id: string, tenantId: string) {
  return prisma.project.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
}

const KINDS: NarratorKind[] = ["backbone", "character"];

const SELECT = {
  id: true,
  name: true,
  kind: true,
  voiceStyle: true,
  language: true,
  characterBio: true,
  preferredDrivers: true,
  voiceModel: true,
  voiceId: true,
  characterContractJson: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    const p = await assertProject(id, user.tenantId);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const narrators = await prisma.narratorProfile.findMany({
      where: { projectId: id },
      orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
      select: SELECT,
    });
    return NextResponse.json({ narrators });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api narrators GET]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function POST(
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
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (name.length < 1) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }
    const voiceStyle =
      typeof body?.voiceStyle === "string" ? body.voiceStyle.trim() : "";
    const kind: NarratorKind = KINDS.includes(body?.kind)
      ? body.kind
      : "backbone";

    const narrator = await prisma.narratorProfile.create({
      data: {
        projectId: id,
        name,
        kind,
        voiceStyle: voiceStyle || "neutro",
        language: typeof body?.language === "string" ? body.language : "it",
        characterBio:
          typeof body?.characterBio === "string" ? body.characterBio : null,
        preferredDrivers: Array.isArray(body?.preferredDrivers)
          ? body.preferredDrivers.filter((x: unknown) => typeof x === "string")
          : [],
        voiceModel:
          typeof body?.voiceModel === "string" ? body.voiceModel : null,
        voiceId: typeof body?.voiceId === "string" ? body.voiceId : null,
        characterContractJson:
          body?.characterContractJson &&
          typeof body.characterContractJson === "object"
            ? body.characterContractJson
            : {},
      },
      select: SELECT,
    });
    return NextResponse.json({ narrator }, { status: 201 });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api narrators POST]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
