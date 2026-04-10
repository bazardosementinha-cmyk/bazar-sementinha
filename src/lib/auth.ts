import { supabaseServer } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = supabaseServer();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { ok: false as const, reason: "not_authenticated" as const };
  }

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (pErr || !profile || profile.role !== "admin") {
    return { ok: false as const, reason: "not_admin" as const, user };
  }

  return { ok: true as const, user };
}
