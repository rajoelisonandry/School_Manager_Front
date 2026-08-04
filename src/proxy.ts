import { NextRequest, NextResponse } from "next/server";

// Doit rester identique à AUTH_COOKIE_NAME dans src/lib/backend/http.ts.
// Ici on ne fait qu'une vérification de présence pour rediriger vite : la
// vraie validation du JWT a toujours lieu côté backend, à chaque appel API.
const AUTH_COOKIE_NAME = "token";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
