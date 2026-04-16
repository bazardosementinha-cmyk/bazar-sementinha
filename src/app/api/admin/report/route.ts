import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { ItemStatus } from "@/lib/utils";

type Row = {
  status: ItemStatus | null;
  price: number | null;
  sold_price: number | null;
  sold_price_final: number | null;
};

type ReportRow = { status: string; count: number; total: number };

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const supabase = await supabaseServer();

  // 🔥 agora buscamos sold_price e sold_price_final também
  const { data, error } = await supabase
    .from("items")
    .select("status, price, sold_price, sold_price_final");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rowsMap = new Map<string, { count: number; total: number }>();
  let soldTotal = 0;

  for (const r of (data ?? []) as Row[]) {
    const statusKey = (r.status ?? "unknown") as string;

    // total real:
    // - sold => sold_price_final (fallback sold_price, fallback price)
    // - outros => price
    const announced = Number(r.price ?? 0);
    const soldFinal = Number(r.sold_price_final ?? r.sold_price ?? r.price ?? 0);

    const value = statusKey === "sold" ? soldFinal : announced;

    if (!rowsMap.has(statusKey)) rowsMap.set(statusKey, { count: 0, total: 0 });
    const obj = rowsMap.get(statusKey)!;
    obj.count += 1;
    obj.total += value;

    if (statusKey === "sold") soldTotal += soldFinal;
  }

  const rows: ReportRow[] = [...rowsMap.entries()]
    .map(([status, v]) => ({ status, count: v.count, total: v.total }))
    .sort((a, b) => a.status.localeCompare(b.status));

  return NextResponse.json({ rows, sold_total: soldTotal });
}