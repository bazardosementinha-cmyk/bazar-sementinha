import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";

type OrderItemRow = {
  order_id: string;
  item_id: string;
};

type OrderRow = {
  id: string;
  status: string;
  expires_at: string | null;
  pickup_deadline_at: string | null;
};

function parseCsvParam(raw: string | null): string[] {
  const s = (raw ?? "").trim();
  if (!s) return [];
  return s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function getOrderDeadline(order: Pick<OrderRow, "pickup_deadline_at" | "expires_at">): string | null {
  return order.pickup_deadline_at || order.expires_at || null;
}

function isActiveReservedOrder(order: OrderRow, nowMs: number): boolean {
  if (order.status !== "reserved") return false;

  const deadline = getOrderDeadline(order);
  if (!deadline) return true;

  const deadlineMs = new Date(deadline).getTime();
  if (Number.isNaN(deadlineMs)) return true;

  return deadlineMs > nowMs;
}

async function getLockedItemIds(itemIds: string[]): Promise<Set<string>> {
  if (!itemIds.length) return new Set<string>();

  const s = supabaseService();

  const { data: orderItems, error: oiErr } = await s
    .from("order_items")
    .select("order_id,item_id")
    .in("item_id", itemIds);

  if (oiErr || !orderItems?.length) return new Set<string>();

  const refs = orderItems as OrderItemRow[];
  const orderIds = Array.from(new Set(refs.map((r) => r.order_id))).filter(Boolean);
  if (!orderIds.length) return new Set<string>();

  const { data: orders, error: oErr } = await s
    .from("orders")
    .select("id,status,expires_at,pickup_deadline_at")
    .in("id", orderIds);

  if (oErr || !orders?.length) return new Set<string>();

  const nowMs = Date.now();
  const activeOrderIds = new Set(
    (orders as OrderRow[])
      .filter((order) => isActiveReservedOrder(order, nowMs))
      .map((order) => order.id)
  );

  if (!activeOrderIds.size) return new Set<string>();

  return new Set(
    refs
      .filter((ref) => activeOrderIds.has(ref.order_id))
      .map((ref) => ref.item_id)
  );
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
    .limit(limit * 3);

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

  const rawItems = data ?? [];
  if (!rawItems.length) return NextResponse.json({ items: [] });

  const lockedIds = await getLockedItemIds(rawItems.map((item) => item.id));

  const items = rawItems
    .filter((item) => !lockedIds.has(item.id))
    .slice(0, limit);

  return NextResponse.json({ items });
}