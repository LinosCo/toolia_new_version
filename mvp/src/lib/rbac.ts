import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/enums";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

export interface SessionUser {
  id: string;
  email: string;
  tenantId: string;
  role: Role;
}

export async function getSessionUser(): Promise<SessionUser> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u?.tenantId || !u?.role || !u?.email) {
    throw new UnauthorizedError();
  }
  return {
    id: u.id,
    email: u.email,
    tenantId: u.tenantId,
    role: u.role,
  };
}

export function requireRole(user: SessionUser, roles: Role[]): void {
  if (!roles.includes(user.role)) {
    throw new ForbiddenError();
  }
}

export function handleAuthError(err: unknown): Response | null {
  if (err instanceof UnauthorizedError) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  if (err instanceof ForbiddenError) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  return null;
}
