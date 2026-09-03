import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export async function getAuthUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

export async function requireAuthUser(): Promise<User | { error: string; status: number }> {
  const user = await getAuthUser();
  if (!user) return { error: "Unauthorized", status: 401 };
  return user;
}
