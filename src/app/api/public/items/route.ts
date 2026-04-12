import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = (url.searchParams.get("short_ids") ?? "").trim();
  const shortIds = raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];

  if (!shortIds.length) return NextResponse.json({ items: [] });

  const supabase = supabasePublic();
  const { data, error } = await supabase
    .from("items")
    .select("id,short_id,title,category,condition,size,price,price_from,status,created_at")
    .in("short_id", shortIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}