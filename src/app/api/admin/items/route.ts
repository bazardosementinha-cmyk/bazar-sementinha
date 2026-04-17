import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const url = new URL(req.url);
  const shortId = (url.searchParams.get("short_id") || "").trim();
  if (!shortId) return NextResponse.json({ error: "short_id é obrigatório" }, { status: 400 });

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("items")
    .select(
      "id,short_id,title,description,category,condition,price,price_from,status,gender,age_group,season,size_type,size_value,location_box,notes_internal,sold_price,sold_price_final"
    )
    .eq("short_id", shortId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  return NextResponse.json({ item: data });
}
