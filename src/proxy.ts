import { NextResponse } from "next/server";

import { auth } from "@/auth";

/**
 * Route protection (Next 16 proxy — the successor of middleware.ts).
 * Pages additionally verify the session server-side; this is the first gate.
 */
export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;

  const needsAdmin = nextUrl.pathname.startsWith("/admin");
  if (needsAdmin) {
    if (!session?.user) {
      const login = new URL("/prihlasenie", nextUrl);
      return NextResponse.redirect(login);
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return;
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL("/prihlasenie", nextUrl));
  }
});

export const config = {
  matcher: [
    "/ucet/:path*",
    "/zoznamy/:path*",
    "/oblubene/:path*",
    "/usetrene/:path*",
    "/admin/:path*",
  ],
};
