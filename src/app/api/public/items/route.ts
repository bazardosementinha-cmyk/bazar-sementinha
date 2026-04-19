import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";

export const runtime = "nodejs";

function parseShortIds(raw: string | null): string[] {
  if (!raw) return [];
  const s = raw.trim();
  if (!s) return [];
  // Aceita: "A1,B2", ou '["A1","B2"]'
  if (s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    } catch {
      // fallback: continua abaixo
    }
  }
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const shortIds =
    parseShortIds(url.searchParams.get("short_ids")) ||
    [];

  const shortIdSingle = url.searchParams.get("short_id");
  const shortIdAll = url.searchParams.getAll("short_id").filter(Boolean);

  const ids = Array.from(
    new Set<string>([
      ...shortIds,
      ...(shortIdSingle ? [shortIdSingle] : []),
      ...shortIdAll,
    ])
  ).filter((x) => typeof x === "string" && x.trim().length > 0);

  if (!ids.length) {
    // Para checkout, é melhor devolver lista vazia do que 400.
    return NextResponse.json({ items: [] });
  }

  const supabase = supabasePublic();
  const { data, error } = await supabase
    .from("items")
    .select("id,short_id,title,category,condition,price,price_from,status,created_at,size")
    .in("short_id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Mantém a ordem do carrinho
  const orderMap = new Map(ids.map((id, idx) => [id, idx]));
  const items = (data || []).sort((a, b) => (orderMap.get(a.short_id) ?? 999) - (orderMap.get(b.short_id) ?? 999));

  return NextResponse.json({ items });
}
