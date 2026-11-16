/** Where to send a user after sign-in. Only same-site paths, to prevent open redirects. */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.startsWith("/login") || next.startsWith("/signup") || next.startsWith("/auth/")) return fallback;
  return next;
}

export type OAuthProvider = "google" | "github";

/** OAuth buttons shown on the login page. Enable each provider in Supabase first. */
export function enabledOAuthProviders(): OAuthProvider[] {
  return (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "")
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is OAuthProvider => p === "google" || p === "github");
}
