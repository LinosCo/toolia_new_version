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

export async function GET() {
  try {
    const user = await getSessionUser();
    const projects = await prisma.project.findMany({
      where: { tenantId: user.tenantId, status: { not: "archived" } },
      orderBy: { updatedAt: "desc" },
      select: {
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
      },
    });
    return NextResponse.json({ projects });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api/projects GET]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);

    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (name.length < 2) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }

    const typeRaw = body?.type;
    const type: ProjectType = VALID_TYPES.includes(typeRaw) ? typeRaw : "altro";

    const project = await prisma.project.create({
      data: {
        tenantId: user.tenantId,
        name,
        type,
        coverImage:
          typeof body?.coverImage === "string" ? body.coverImage : null,
        address: typeof body?.address === "string" ? body.address : null,
        mapsLink: typeof body?.mapsLink === "string" ? body.mapsLink : null,
        city: typeof body?.city === "string" ? body.city : null,
      },
      select: {
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
      },
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api/projects POST]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
