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

function parseShortIds(raw: string | null): string[] {
  if (!raw) return [];
  const s = raw.trim();
  if (!s) return [];

  if (s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      }
    } catch {
      // segue para o fallback CSV
    }
  }

  return s
    .split(",")
    .map((x) => x.trim())
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

  const shortIds = parseShortIds(url.searchParams.get("short_ids"));
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
    return NextResponse.json({ items: [] });
  }

  const supabase = supabasePublic();
  const { data, error } = await supabase
    .from("items")
    .select("id,short_id,title,category,condition,price,price_from,status,created_at,size")
    .in("short_id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rawItems = data || [];
  if (!rawItems.length) return NextResponse.json({ items: [] });

  const lockedIds = await getLockedItemIds(rawItems.map((item) => item.id));
  const orderMap = new Map(ids.map((id, idx) => [id, idx]));

  const items = rawItems
    .filter((item) => !lockedIds.has(item.id))
    .sort((a, b) => (orderMap.get(a.short_id) ?? 999) - (orderMap.get(b.short_id) ?? 999));

  return NextResponse.json({ items });
}