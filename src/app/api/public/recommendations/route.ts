import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";

function parseCsvParam(raw: string | null): string[] {
  const s = (raw ?? "").trim();
  if (!s) return [];
  return s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const exclude = parseCsvParam(url.searchParams.get("exclude"));
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.max(1, Math.min(12, Number.parseInt(limitRaw ?? "6", 10) || 6));

  const supabase = supabasePublic();

  let query = supabase
    .from("items")
    .select("id,short_id,title,category,condition,size,price,price_from,status,created_at")
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (exclude.length) {
    const inList = exclude
      .map((v) => v.replace(/"/g, "").trim())
      .filter(Boolean)
      .map((v) => `"${v}"`)
      .join(",");
    query = query.not("short_id", "in", `(${inList})`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
