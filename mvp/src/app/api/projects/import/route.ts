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

// Endpoint dedicato all'import da backup: permette di passare l'id del progetto
// (serve per preservare gli id legacy dei progetti pre-migrazione).
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);

    const body = await req.json();
    const src = body?.project;
    if (!src || typeof src !== "object" || typeof src.id !== "string") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    const name = typeof src.name === "string" ? src.name.trim() : "";
    if (name.length < 1) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }
    const typeRaw = src.type;
    const type: ProjectType = VALID_TYPES.includes(typeRaw) ? typeRaw : "altro";

    const existing = await prisma.project.findUnique({
      where: { id: src.id },
      select: { id: true, tenantId: true },
    });
    if (existing && existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "id_conflict" }, { status: 409 });
    }

    const project = existing
      ? await prisma.project.update({
          where: { id: src.id },
          data: {
            name,
            type,
            coverImage:
              typeof src.coverImage === "string" ? src.coverImage : null,
            address: typeof src.address === "string" ? src.address : null,
            mapsLink: typeof src.mapsLink === "string" ? src.mapsLink : null,
            city: typeof src.city === "string" ? src.city : null,
          },
        })
      : await prisma.project.create({
          data: {
            id: src.id,
            tenantId: user.tenantId,
            name,
            type,
            coverImage:
              typeof src.coverImage === "string" ? src.coverImage : null,
            address: typeof src.address === "string" ? src.address : null,
            mapsLink: typeof src.mapsLink === "string" ? src.mapsLink : null,
            city: typeof src.city === "string" ? src.city : null,
            createdAt:
              typeof src.createdAt === "string" && src.createdAt
                ? new Date(src.createdAt)
                : undefined,
          },
        });

    return NextResponse.json({ project: { id: project.id } }, { status: 201 });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api projects/import POST]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
