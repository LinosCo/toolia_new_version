import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";
import type { NarratorKind } from "@/generated/prisma/enums";

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
  portraitUrl: true,
  characterContractJson: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function assertOwnership(
  projectId: string,
  narratorId: string,
  tenantId: string,
) {
  return prisma.narratorProfile.findFirst({
    where: { id: narratorId, projectId, project: { tenantId } },
    select: { id: true },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; narratorId: string }> },
) {
  try {
    const { id, narratorId } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const ok = await assertOwnership(id, narratorId, user.tenantId);
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body?.name === "string" && body.name.trim().length > 0)
      data.name = body.name.trim();
    if (KINDS.includes(body?.kind)) data.kind = body.kind;
    if (typeof body?.voiceStyle === "string") data.voiceStyle = body.voiceStyle;
    if (typeof body?.language === "string") data.language = body.language;
    if (typeof body?.characterBio === "string" || body?.characterBio === null)
      data.characterBio = body.characterBio;
    if (Array.isArray(body?.preferredDrivers))
      data.preferredDrivers = body.preferredDrivers.filter(
        (x: unknown) => typeof x === "string",
      );
    if (typeof body?.voiceModel === "string" || body?.voiceModel === null)
      data.voiceModel = body.voiceModel;
    if (typeof body?.voiceId === "string" || body?.voiceId === null)
      data.voiceId = body.voiceId;
    if (typeof body?.portraitUrl === "string" || body?.portraitUrl === null)
      data.portraitUrl = body.portraitUrl;
    if (
      body?.characterContractJson &&
      typeof body.characterContractJson === "object"
    )
      data.characterContractJson = body.characterContractJson;

    const narrator = await prisma.narratorProfile.update({
      where: { id: narratorId },
      data,
      select: SELECT,
    });
    return NextResponse.json({ narrator });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api narrators PATCH]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; narratorId: string }> },
) {
  try {
    const { id, narratorId } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const ok = await assertOwnership(id, narratorId, user.tenantId);
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await prisma.narratorProfile.delete({ where: { id: narratorId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api narrators DELETE]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
