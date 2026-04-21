import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";

type ItemRow = {
  id: string;
  short_id: string;
  title: string;
  category: string;
  condition: string;
  price: number;
  price_from: number | null;
  status: string;
  created_at: string;
};

type OrderItemRow = {
  order_id: string;
  item_id: string;
};

type OrderRow = {
  id: string;
  code: string;
  status: string;
  expires_at: string | null;
  pickup_deadline_at: string | null;
  payment_plan: string | null;
};

type ReservationLock = {
  locked: boolean;
  order_code: string | null;
  deadline_at: string | null;
  payment_plan: string | null;
};

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

function lockScore(order: OrderRow): number {
  const deadline = getOrderDeadline(order);
  if (!deadline) return Number.MAX_SAFE_INTEGER;

  const ms = new Date(deadline).getTime();
  return Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms;
}

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const supabase = supabaseService();

  const { data, error } = await supabase
    .from("items")
    .select("id,short_id,title,category,condition,price,price_from,status,created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data ?? []) as ItemRow[];
  if (!items.length) return NextResponse.json({ items: [] });

  const itemIds = items.map((item) => item.id);

  const { data: orderItems, error: oiErr } = await supabase
    .from("order_items")
    .select("order_id,item_id")
    .in("item_id", itemIds);

  if (oiErr) return NextResponse.json({ error: oiErr.message }, { status: 500 });

  const refs = (orderItems ?? []) as OrderItemRow[];
  const orderIds = Array.from(new Set(refs.map((r) => r.order_id))).filter(Boolean);

  let ordersById = new Map<string, OrderRow>();
  if (orderIds.length) {
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("id,code,status,expires_at,pickup_deadline_at,payment_plan")
      .in("id", orderIds);

    if (ordersErr) return NextResponse.json({ error: ordersErr.message }, { status: 500 });

    ordersById = new Map(((orders ?? []) as OrderRow[]).map((order) => [order.id, order]));
  }

  const nowMs = Date.now();
  const locksByItemId: Record<string, ReservationLock> = {};

  for (const ref of refs) {
    const order = ordersById.get(ref.order_id);
    if (!order) continue;
    if (!isActiveReservedOrder(order, nowMs)) continue;

    const current = locksByItemId[ref.item_id];
    if (!current) {
      locksByItemId[ref.item_id] = {
        locked: true,
        order_code: order.code,
        deadline_at: getOrderDeadline(order),
        payment_plan: order.payment_plan,
      };
      continue;
    }

    const currentScore = current.deadline_at
      ? new Date(current.deadline_at).getTime()
      : Number.MAX_SAFE_INTEGER;
    const nextScore = lockScore(order);

    if (nextScore > currentScore) {
      locksByItemId[ref.item_id] = {
        locked: true,
        order_code: order.code,
        deadline_at: getOrderDeadline(order),
        payment_plan: order.payment_plan,
      };
    }
  }

  const out = items.map((item) => ({
    ...item,
    reservation_lock: locksByItemId[item.id] ?? {
      locked: false,
      order_code: null,
      deadline_at: null,
      payment_plan: null,
    },
  }));

  return NextResponse.json({ items: out });
}