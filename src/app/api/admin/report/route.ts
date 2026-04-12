import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { ItemStatus } from "@/lib/utils";

type Row = { status: ItemStatus | null; price: number | null };
type ReportRow = { status: string; count: number; total: number };

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const supabase = await supabaseServer();

  const { data, error } = await supabase.from("items").select("status, price");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rowsMap = new Map<string, { count: number; total: number }>();
  let soldTotal = 0;

  for (const r of (data ?? []) as Row[]) {
    const statusKey = (r.status ?? "unknown") as string;
    const price = Number(r.price ?? 0);

    if (!rowsMap.has(statusKey)) rowsMap.set(statusKey, { count: 0, total: 0 });
    const obj = rowsMap.get(statusKey)!;
    obj.count += 1;
    obj.total += price;

    if (statusKey === "sold") soldTotal += price;
  }

  const rows: ReportRow[] = [...rowsMap.entries()]
    .map(([status, v]) => ({ status, count: v.count, total: v.total }))
    .sort((a, b) => a.status.localeCompare(b.status));

  return NextResponse.json({ rows, sold_total: soldTotal });
}