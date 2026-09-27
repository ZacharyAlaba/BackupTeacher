import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { authSecret } from "@/lib/authSecret";
import { refreshSupabaseSession } from "@/utils/supabase/middleware";

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie);
  });
}

export default async function middleware(req: NextRequest) {
  const supabaseResponse = await refreshSupabaseSession(req);
  const token = await getToken({ req, secret: authSecret });
  const path = req.nextUrl.pathname;

  const redirectWithCookies = (destination: string) => {
    const response = NextResponse.redirect(new URL(destination, req.url));
    copyCookies(supabaseResponse, response);
    return response;
  };

  const role = token?.role;
  // Route unauthenticated users to login instead of bouncing between /admin and /teacher.
  const homeForRole = (r?: string) => (r === "ADMIN" ? "/admin" : r === "TEACHER" ? "/teacher" : r === "STUDENT" ? "/student" : "/login");

  if (path.startsWith("/admin")) {
    if (!role) return redirectWithCookies("/login/admin");
    if (role !== "ADMIN") return redirectWithCookies(homeForRole(role));
  }

  if (path.startsWith("/teacher")) {
    if (!role) return redirectWithCookies("/login/teacher");
    if (role !== "TEACHER") return redirectWithCookies(homeForRole(role));
  }

  if (path.startsWith("/student")) {
    if (!role) return redirectWithCookies("/login");
    if (role !== "STUDENT") return redirectWithCookies(homeForRole(role));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*"],
};
