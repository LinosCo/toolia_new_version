import type { NextAuthConfig } from "next-auth";

const PUBLIC_PATHS = ["/auth/signin", "/auth/verify", "/auth/error", "/v/"];

// API consumate dalla rotta pubblica /v/. Devono essere accessibili senza
// sessione; il filtro per progetti `published` è applicato dentro la route.
const PUBLIC_API_PATTERNS = [
  /^\/api\/projects\/[^/]+\/visitor-data$/,
  /^\/api\/projects\/[^/]+\/compose-visit$/,
  /^\/api\/projects\/[^/]+\/assistant-qa(\/[^/]+)?$/,
];

// Config edge-safe: no adapter, no Prisma.
// Usata dal middleware per decidere allow/redirect.
// La config completa con adapter + providers vive in auth.ts.
export const authConfig = {
  providers: [],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
  },
  callbacks: {
    authorized({ auth, request }) {
      // Bypass totale in dev: nessun redirect a signin.
      if (process.env.DEV_BYPASS_AUTH === "true") return true;
      const { pathname } = request.nextUrl;
      if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return true;
      if (PUBLIC_API_PATTERNS.some((p) => p.test(pathname))) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
