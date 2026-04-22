import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = ["/auth/signin", "/auth/verify", "/auth/error"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Route pubbliche
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const signinUrl = new URL("/auth/signin", req.nextUrl.origin);
    signinUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signinUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Applica middleware a tutte le route TRANNE:
    // - /api/auth/** (NextAuth endpoints)
    // - /_next/** (asset Next)
    // - file statici con estensione
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
