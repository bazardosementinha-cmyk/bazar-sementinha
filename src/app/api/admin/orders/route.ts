import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase/service";

type OrderRow = {
  id: string;
  code: string;
  status: string;
  total: number;
  customer_instagram: string;
  expires_at: string;
  created_at: string;
};

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const s = supabaseService();

  const { data: orders, error } = await s
    .from("orders")
    .select("id,code,status,total,customer_instagram,expires_at,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = (orders ?? []) as OrderRow[];
  const orderIds = list.map((o) => o.id);

  // Compute item counts per order
  let counts: Record<string, number> = {};
  if (orderIds.length) {
    const { data: items, error: iErr } = await s
      .from("order_items")
      .select("order_id")
      .in("order_id", orderIds);

    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

    counts = (items ?? []).reduce<Record<string, number>>((acc, row) => {
      const id = (row as { order_id: string }).order_id;
      acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    }, {});
  }

  const out = list.map((o) => ({ ...o, items_count: counts[o.id] ?? 0 }));
  return NextResponse.json({ orders: out });
}
