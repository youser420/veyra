import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth-redirect";

/**
 * Landing point for Google/GitHub sign-in and email sign-in links.
 * Exchanges the one-time code for a session cookie, then sends the user on.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const next = safeNextPath(params.get("next"));
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  let error = params.get("error_description");
  if (!error) {
    const supabase = await createSupabaseServerClient();
    if (code) {
      const result = await supabase.auth.exchangeCodeForSession(code);
      error = result.error?.message ?? null;
    } else if (tokenHash && type) {
      const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      error = result.error?.message ?? null;
    } else {
      error = "This sign-in link is incomplete.";
    }
  }

  if (error) {
    const login = new URL("/login", req.nextUrl.origin);
    // Usually the link was opened in a different browser, or already used / expired.
    login.searchParams.set("error", "link");
    login.searchParams.set("next", next);
    console.warn("Auth callback failed:", error);
    return NextResponse.redirect(login);
  }

  return NextResponse.redirect(new URL(next, req.nextUrl.origin));
}
