import { NextResponse } from "next/server";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { prisma } from "@/lib/db";

const DEFAULT_TENSION = {
  mustTellJson: [],
  niceToTellJson: [],
  avoidJson: [],
  verifyJson: [],
  tensionsJson: [],
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getSessionUser();
    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!project) return new Response("Not found", { status: 404 });

    const tension = await prisma.narrativeTension.findUnique({
      where: { projectId: id },
    });
    return NextResponse.json(tension ?? { projectId: id, ...DEFAULT_TENSION });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!project) return new Response("Not found", { status: 404 });

    const body = await req.json();

    // Validate that the JSON fields are arrays (or omit them for safety)
    const data = {
      mustTellJson: Array.isArray(body.mustTellJson) ? body.mustTellJson : [],
      niceToTellJson: Array.isArray(body.niceToTellJson) ? body.niceToTellJson : [],
      avoidJson: Array.isArray(body.avoidJson) ? body.avoidJson : [],
      verifyJson: Array.isArray(body.verifyJson) ? body.verifyJson : [],
      tensionsJson: Array.isArray(body.tensionsJson) ? body.tensionsJson : [],
    };

    const upserted = await prisma.narrativeTension.upsert({
      where: { projectId: id },
      update: data,
      create: { projectId: id, ...data },
    });
    return NextResponse.json(upserted);
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}
