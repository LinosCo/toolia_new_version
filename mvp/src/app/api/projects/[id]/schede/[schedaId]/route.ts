import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";
import type { SchedaStatus } from "@/generated/prisma/enums";

const STATUSES: SchedaStatus[] = [
  "draft",
  "in_review",
  "client_review",
  "published",
  "archived",
];

const SELECT = {
  id: true,
  poiId: true,
  narratorId: true,
  language: true,
  title: true,
  scriptText: true,
  durationEstimateSeconds: true,
  isCore: true,
  isDeepDive: true,
  status: true,
  version: true,
  qualityScore: true,
  semanticBaseJson: true,
  createdAt: true,
  updatedAt: true,
  audio: {
    select: {
      id: true,
      fileUrl: true,
      durationSeconds: true,
      voiceModel: true,
      isStale: true,
      updatedAt: true,
    },
  },
} as const;

async function assertOwnership(
  projectId: string,
  schedaId: string,
  tenantId: string,
) {
  return prisma.scheda.findFirst({
    where: { id: schedaId, projectId, project: { tenantId } },
  });
}

function wordsPerMinute(text: string, wpm = 150): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round((words / wpm) * 60);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; schedaId: string }> },
) {
  try {
    const { id, schedaId } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const existing = await assertOwnership(id, schedaId, user.tenantId);
    if (!existing)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (typeof body?.title === "string") data.title = body.title;
    if (typeof body?.scriptText === "string") {
      data.scriptText = body.scriptText;
      data.durationEstimateSeconds = wordsPerMinute(body.scriptText);
    }
    if (typeof body?.isCore === "boolean") data.isCore = body.isCore;
    if (typeof body?.isDeepDive === "boolean")
      data.isDeepDive = body.isDeepDive;
    if (body?.semanticBaseJson && typeof body.semanticBaseJson === "object") {
      data.semanticBaseJson = body.semanticBaseJson;
    }

    // Invariante: modifica al contenuto di una scheda published → torna draft + version++
    const contentChanged =
      typeof body?.scriptText === "string" &&
      body.scriptText !== existing.scriptText;
    const titleChanged =
      typeof body?.title === "string" && body.title !== existing.title;

    let statusChange: SchedaStatus | undefined;
    // Cambio status esplicito via body?
    if (
      typeof body?.status === "string" &&
      STATUSES.includes(body.status as SchedaStatus)
    ) {
      statusChange = body.status as SchedaStatus;
    }

    if (
      existing.status === "published" &&
      (contentChanged || titleChanged) &&
      !statusChange
    ) {
      data.status = "draft";
      data.version = existing.version + 1;
    } else if (statusChange) {
      data.status = statusChange;
      if (statusChange === "draft" && existing.status !== "draft") {
        // versione bump solo se torniamo a draft da altro stato per modifiche successive
      }
    }

    // Audio stale: se scriptText cambia e c'è audio associato → isStale
    if (contentChanged) {
      const audio = await prisma.audioAsset.findUnique({
        where: { schedaId },
        select: { id: true },
      });
      if (audio) {
        await prisma.audioAsset.update({
          where: { schedaId },
          data: { isStale: true },
        });
      }
    }

    const scheda = await prisma.scheda.update({
      where: { id: schedaId },
      data,
      select: SELECT,
    });
    return NextResponse.json({ scheda });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api schede PATCH]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; schedaId: string }> },
) {
  try {
    const { id, schedaId } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const existing = await assertOwnership(id, schedaId, user.tenantId);
    if (!existing)
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    await prisma.scheda.delete({ where: { id: schedaId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api schede DELETE]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
