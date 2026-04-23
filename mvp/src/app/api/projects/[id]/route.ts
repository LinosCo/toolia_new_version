import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";
import type { ProjectType } from "@/generated/prisma/enums";

const VALID_TYPES: ProjectType[] = [
  "villa",
  "museo",
  "cantina",
  "citta",
  "parco",
  "territorio",
  "altro",
];

const PROJECT_SELECT = {
  id: true,
  name: true,
  type: true,
  status: true,
  coverImage: true,
  address: true,
  mapsLink: true,
  city: true,
  languages: true,
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
    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
      select: PROJECT_SELECT,
    });
    if (!project) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api/projects/[id] GET]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body?.name === "string" && body.name.trim().length >= 2) {
      data.name = body.name.trim();
    }
    if (typeof body?.type === "string" && VALID_TYPES.includes(body.type)) {
      data.type = body.type;
    }
    if (typeof body?.coverImage === "string" || body?.coverImage === null) {
      data.coverImage = body.coverImage;
    }
    if (typeof body?.address === "string" || body?.address === null) {
      data.address = body.address;
    }
    if (typeof body?.mapsLink === "string" || body?.mapsLink === null) {
      data.mapsLink = body.mapsLink;
    }
    if (typeof body?.city === "string" || body?.city === null) {
      data.city = body.city;
    }

    const existing = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const project = await prisma.project.update({
      where: { id },
      data,
      select: PROJECT_SELECT,
    });
    return NextResponse.json({ project });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api/projects/[id] PATCH]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);

    const existing = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Hard delete per MVP — cascade rimuove tutte le relazioni.
    // Cambiare in soft delete (status = archived) quando servirà cestino.
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api/projects/[id] DELETE]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
