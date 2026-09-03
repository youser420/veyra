import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAuthUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createServiceSupabase();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, prefix, calls_used, calls_limit, is_active, last_used_at, created_at")
    .eq("user_id", auth.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAuthUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const name = body.name || "Default Key";

  const fullKey = `vyr_live_${crypto.randomBytes(32).toString("hex")}`;
  const keyHash = await bcrypt.hash(fullKey, 10);
  const prefix = fullKey.slice(0, 16);

  const supabase = createServiceSupabase();
  const { error } = await supabase.from("api_keys").insert({
    user_id: auth.id,
    key_hash: keyHash,
    prefix,
    name,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ fullKey, prefix });
}
