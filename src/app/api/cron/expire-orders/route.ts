import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ua = req.headers.get("user-agent") || "";
  const isVercelCron = ua.includes("vercel-cron/1.0");

  // Security options:
  // - If called by Vercel Cron Jobs, the User-Agent is `vercel-cron/1.0` (docs).
  // - For manual/external schedulers, allow a secret via query/header.
  const secret = url.searchParams.get("secret") || req.headers.get("x-cron-secret") || "";
  const expected = process.env.CRON_SECRET || "";
  const ok = isVercelCron || (expected && secret === expected);

  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const s = supabaseService();
  const nowIso = new Date().toISOString();

  // Find expired reserved orders
  const { data: orders, error: oErr } = await s
    .from("orders")
    .select("id")
    .eq("status", "reserved")
    .lte("expires_at", nowIso)
    .limit(200);

  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });
  const ids = (orders ?? []).map((r) => (r as { id: string }).id);
  if (!ids.length) return NextResponse.json({ ok: true, expired: 0 });

  // Load item ids for those orders
  const { data: oi, error: oiErr } = await s
    .from("order_items")
    .select("order_id,item_id")
    .in("order_id", ids);
  if (oiErr) return NextResponse.json({ error: oiErr.message }, { status: 500 });

  const itemIds = (oi ?? []).map((r) => (r as { item_id: string }).item_id);

  // Cancel orders
  const { error: cErr } = await s
    .from("orders")
    .update({ status: "cancelled", cancelled_at: nowIso })
    .in("id", ids);
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  // Release items
  if (itemIds.length) {
    const { error: iErr } = await s
      .from("items")
      .update({ status: "available" })
      .in("id", itemIds)
      .eq("status", "reserved");
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, expired: ids.length });
}
