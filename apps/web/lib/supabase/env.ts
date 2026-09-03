import { NextResponse } from "next/server";

function isPlaceholder(value?: string) {
  if (!value) return true;
  return (
    value.includes("your_") ||
    value === "placeholder" ||
    value === "your_supabase_project_url"
  );
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    typeof url === "string" &&
    url.startsWith("http") &&
    !isPlaceholder(url) &&
    typeof serviceKey === "string" &&
    !isPlaceholder(serviceKey) &&
    typeof anonKey === "string" &&
    !isPlaceholder(anonKey)
  );
}

export function supabaseConfigErrorResponse(extra: Record<string, unknown> = {}) {
  return NextResponse.json(
    {
      error:
        "Supabase is not configured. Copy .env.local.example to apps/web/.env.local and set your Supabase URL and API keys.",
      ...extra,
    },
    { status: 503 }
  );
}
