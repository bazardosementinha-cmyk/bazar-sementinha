import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const supabase = supabaseServer();

  // group by status (client-side aggregation for simplicity)
  const { data, error } = await supabase
    .from("items")
    .select("status, price");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rowsMap = new Map<string, { status: any; count: number; total: number }>();
  let soldTotal = 0;

  for (const r of data ?? []) {
    const status = r.status;
    const price = Number(r.price ?? 0);
    if (!rowsMap.has(status)) rowsMap.set(status, { status, count: 0, total: 0 });
    const obj = rowsMap.get(status)!;
    obj.count += 1;
    obj.total += price;
    if (status === "sold") soldTotal += price;
  }

  const rows = [...rowsMap.values()].sort((a, b) => a.status.localeCompare(b.status));
  return NextResponse.json({ rows, sold_total: soldTotal });
}
