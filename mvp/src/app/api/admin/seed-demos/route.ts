import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";
import { mockProjects } from "@/lib/mock-projects";
import type { ProjectType } from "@/generated/prisma/enums";

// Seed idempotente dei progetti demo (Villa La Rotonda, Museo del Risorgimento, ecc.)
// Usa lo stesso id/cover dei mock cosicché ri-esecuzioni non duplichino.
export async function POST() {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin"]);

    let inserted = 0;
    let skipped = 0;

    for (const m of mockProjects) {
      const existing = await prisma.project.findUnique({
        where: { id: m.id },
        select: { id: true, tenantId: true },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.project.create({
        data: {
          id: m.id,
          tenantId: user.tenantId,
          name: m.name,
          type: m.type as ProjectType,
          coverImage: m.coverImage ?? null,
          city: m.location ?? null,
          languages: m.languages,
        },
      });
      inserted++;
    }
    return NextResponse.json({ inserted, skipped });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api admin seed-demos]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
