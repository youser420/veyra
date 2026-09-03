import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const status = body.status as string;
  if (!["acknowledged", "resolved", "open"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createServiceSupabase();
  const patch: Record<string, string | null> = { status };
  if (status === "resolved") {
    patch.resolved_at = new Date().toISOString();
  } else {
    patch.resolved_at = null;
  }

  const { data, error } = await supabase
    .from("trust_incidents")
    .update(patch)
    .eq("id", params.id)
    .eq("creator_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ incident: data });
}
