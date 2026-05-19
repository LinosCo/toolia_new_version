import { NextResponse } from "next/server";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import {
  listTenantApiKeys,
  setTenantApiKey,
  deleteTenantApiKey,
  type TenantApiProvider,
} from "@/lib/tenant-keys";

const VALID_PROVIDERS: TenantApiProvider[] = [
  "openai", "anthropic", "kimi", "elevenlabs", "googleMaps",
];

export async function GET() {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin"]);
    const keys = await listTenantApiKeys(user.tenantId);
    return NextResponse.json({ keys });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin"]);
    const body = await req.json();
    if (!VALID_PROVIDERS.includes(body.provider)) {
      return NextResponse.json({ error: "invalid_provider" }, { status: 400 });
    }
    if (typeof body.value !== "string" || body.value.trim() === "") {
      return NextResponse.json({ error: "invalid_value" }, { status: 400 });
    }
    await setTenantApiKey(user.tenantId, body.provider, body.value.trim());
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin"]);
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") as TenantApiProvider;
    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: "invalid_provider" }, { status: 400 });
    }
    await deleteTenantApiKey(user.tenantId, provider);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}
