import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

function isGuloseimas(cat: string | null | undefined) {
  return (cat ?? "").trim().toLowerCase() === "guloseimas";
}

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("items").select("category").order("category", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const categories = Array.from(
    new Set((data ?? []).map((r) => (r as { category?: string }).category).filter((c): c is string => !!c && !isGuloseimas(c))),
  ).sort((a, b) => a.localeCompare(b));

  return NextResponse.json({ categories });
}
