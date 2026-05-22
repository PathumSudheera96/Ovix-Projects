import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { CSRF_COOKIE } from "@/lib/auth/csrf";

export function proxy(request: NextRequest) {
  const csrfToken = request.cookies.get(CSRF_COOKIE)?.value ?? crypto.randomUUID().replaceAll("-", "");
  const isLocalhost =
    request.nextUrl.hostname === "localhost" ||
    request.nextUrl.hostname === "127.0.0.1" ||
    request.nextUrl.hostname === "::1";
  const useSecureCookie = process.env.NODE_ENV === "production" && !isLocalhost;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-csrf-token", csrfToken);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      secure: useSecureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
