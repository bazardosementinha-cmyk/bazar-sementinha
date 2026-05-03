import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const url = new URL(req.url);
  const demoOnly = url.searchParams.get("demo") === "1" || url.searchParams.get("demo") === "true";
  const category = url.searchParams.get("category");

  const supabase = supabaseService();
  let q = supabase
    .from("items")
    .select("id,short_id,title,category,price,status,label_template,location_box,is_fragile,is_demo,demo_sort,created_at")
    .order("demo_sort", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (demoOnly) q = q.eq("is_demo", true);
  if (category && category !== "all") q = q.eq("category", category);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}
