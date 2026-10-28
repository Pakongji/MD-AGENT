import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((request) => {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/login") {
    return request.auth
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  if (!request.auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|api/health|_next/static|_next/image|favicon.ico).*)"],
};