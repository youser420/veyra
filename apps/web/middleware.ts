import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/auth-redirect";

export async function middleware(req: NextRequest) {
  // Supabase falls back to the Site URL when /auth/callback isn't in its allowed
  // redirect list; forward the code instead of silently dropping the sign-in.
  if (req.nextUrl.pathname === "/") {
    if (!req.nextUrl.searchParams.has("code")) return NextResponse.next();
    const callback = new URL("/auth/callback", req.url);
    callback.search = req.nextUrl.search;
    return NextResponse.redirect(callback);
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = req.nextUrl;

  const protectedPaths = ["/dashboard", "/verify"];
  if (protectedPaths.some((p) => pathname.startsWith(p)) && !user) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  // Already signed in: skip the login page.
  if ((pathname === "/login" || pathname === "/signup") && user) {
    return NextResponse.redirect(
      new URL(safeNextPath(req.nextUrl.searchParams.get("next")), req.url)
    );
  }

  return res;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/verify/:path*", "/login", "/signup"],
};
