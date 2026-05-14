import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { CSRF_COOKIE } from "@/lib/auth/csrf";

const protectedRoutes = ["/", "/invoices", "/customers", "/payments", "/reports", "/settings"];
const adminRoutes = ["/admin"];

export default auth((req) => {
  const { nextUrl } = req;
  const isProtected = protectedRoutes.some((route) =>
    route === "/" ? nextUrl.pathname === "/" : nextUrl.pathname.startsWith(route)
  );
  const isAdminRoute = adminRoutes.some((route) => nextUrl.pathname.startsWith(route));
  const session = req.auth;

  if (isProtected && !session?.user) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && session?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", nextUrl.origin));
  }

  const csrfToken = req.cookies.get(CSRF_COOKIE)?.value ?? crypto.randomUUID().replaceAll("-", "");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-csrf-token", csrfToken);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (!req.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
  }

  return response;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
