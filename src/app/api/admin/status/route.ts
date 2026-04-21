import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";

type ItemStatus = "review" | "available" | "reserved" | "sold" | "donated" | "archived";

type ItemRow = {
  id: string;
  short_id: string;
  price: number | null;
  sold_price: number | null;
  sold_price_final: number | null;
};

type OrderItemRef = {
  order_id: string;
};

type OrderRow = {
  id: string;
  code: string;
  status: string;
  expires_at: string | null;
  pickup_deadline_at: string | null;
  payment_plan: string | null;
};

type ActiveReservationLock = {
  locked: true;
  order_id: string;
  order_code: string;
  deadline_at: string | null;
  payment_plan: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseStatus(v: unknown): ItemStatus | null {
  const s = typeof v === "string" ? v : "";
  const allowed: ItemStatus[] = ["review", "available", "reserved", "sold", "donated", "archived"];
  return allowed.includes(s as ItemStatus) ? (s as ItemStatus) : null;
}

function parseMoneyBR(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input !== "string") return null;

  const raw = input.trim();
  if (!raw) return null;

  const cleaned = raw.replace(/R\$\s?/gi, "").replace(/\s/g, "");
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
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

function lockScore(order: OrderRow): number {
  const deadline = getOrderDeadline(order);
  if (!deadline) return Number.MAX_SAFE_INTEGER;

  const ms = new Date(deadline).getTime();
  return Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms;
}

async function findActiveReservationLock(
  supabase: ReturnType<typeof supabaseService>,
  itemId: string
): Promise<{ data: ActiveReservationLock | null; error: string | null }> {
  const { data: refs, error: refsErr } = await supabase
    .from("order_items")
    .select("order_id")
    .eq("item_id", itemId);

  if (refsErr) return { data: null, error: refsErr.message };

  const orderIds = Array.from(new Set((refs ?? []).map((r) => (r as OrderItemRef).order_id))).filter(Boolean);
  if (!orderIds.length) return { data: null, error: null };

  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("id,code,status,expires_at,pickup_deadline_at,payment_plan")
    .in("id", orderIds);

  if (ordersErr) return { data: null, error: ordersErr.message };

  const nowMs = Date.now();
  const active = ((orders ?? []) as OrderRow[])
    .filter((order) => isActiveReservedOrder(order, nowMs))
    .sort((a, b) => lockScore(b) - lockScore(a))[0];

  if (!active) return { data: null, error: null };

  return {
    data: {
      locked: true,
      order_id: active.id,
      order_code: active.code,
      deadline_at: getOrderDeadline(active),
      payment_plan: active.payment_plan,
    },
    error: null,
  };
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const supabase = supabaseService();

  let bodyUnknown: unknown;
  try {
    bodyUnknown = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido (JSON)." }, { status: 400 });
  }

  if (!isRecord(bodyUnknown)) {
    return NextResponse.json({ error: "Payload inválido (objeto esperado)." }, { status: 400 });
  }

  const itemId = typeof bodyUnknown.item_id === "string" ? bodyUnknown.item_id : null;
  const shortId = typeof bodyUnknown.short_id === "string" ? bodyUnknown.short_id : null;
  const status = parseStatus(bodyUnknown.status);

  const soldPriceFinalRaw = bodyUnknown.sold_price_final;
  const soldPriceFinalParsed = soldPriceFinalRaw == null ? null : parseMoneyBR(soldPriceFinalRaw);

  if (!itemId && !shortId) {
    return NextResponse.json({ error: "Payload inválido: informe item_id ou short_id." }, { status: 400 });
  }
  if (!status) {
    return NextResponse.json({ error: "Payload inválido: status inválido." }, { status: 400 });
  }
  if (soldPriceFinalRaw != null && soldPriceFinalParsed == null) {
    return NextResponse.json({ error: "Payload inválido: sold_price_final inválido." }, { status: 400 });
  }

  const baseQ = supabase
    .from("items")
    .select("id, short_id, price, sold_price, sold_price_final")
    .limit(1);

  const { data: itemRow, error: selErr } = itemId
    ? await baseQ.eq("id", itemId).maybeSingle()
    : await baseQ.eq("short_id", shortId as string).maybeSingle();

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });
  if (!itemRow) return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });

  const item = itemRow as ItemRow;

  if (status === "available") {
    const { data: lock, error: lockErr } = await findActiveReservationLock(supabase, item.id);
    if (lockErr) return NextResponse.json({ error: lockErr }, { status: 500 });

    if (lock) {
      const deadlineText = lock.deadline_at ? ` até ${lock.deadline_at}` : "";
      return NextResponse.json(
        {
          error: `O item #${item.short_id} está vinculado ao pedido ${lock.order_code} e não pode voltar para disponível enquanto a reserva estiver ativa${deadlineText}.`,
          lock,
        },
        { status: 409 }
      );
    }
  }

  const updatePayload: Partial<ItemRow> & { status: ItemStatus } = { status };

  if (status === "sold") {
    const announced = typeof item.price === "number" && Number.isFinite(item.price) ? item.price : 0;

    const soldPrice =
      typeof item.sold_price === "number" && Number.isFinite(item.sold_price) ? item.sold_price : announced;

    const soldFinal =
      soldPriceFinalParsed != null
        ? soldPriceFinalParsed
        : typeof item.sold_price_final === "number" && Number.isFinite(item.sold_price_final)
          ? item.sold_price_final
          : soldPrice;

    updatePayload.sold_price = soldPrice;
    updatePayload.sold_price_final = soldFinal;
  }

  const { error: updErr } = await supabase.from("items").update(updatePayload).eq("id", item.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    id: item.id,
    short_id: item.short_id,
    status,
    sold_price: status === "sold" ? updatePayload.sold_price : item.sold_price,
    sold_price_final: status === "sold" ? updatePayload.sold_price_final : item.sold_price_final,
  });
}