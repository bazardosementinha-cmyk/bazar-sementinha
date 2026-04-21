import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";

type Order = {
  id: string;
  code: string;
  status: string;
  total: number;
  pix_key: string;
  pickup_location: string;
  customer_name: string;
  customer_email: string | null;
  customer_whatsapp: string | null;
  customer_instagram: string;
  created_at: string;
  expires_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
};

type OrderItem = {
  id: number;
  item_id: string;
  item_short_id: string;
  item_title: string;
  price: number;
};

type Reminder = {
  id: string;
  kind: "remind_8h" | "remind_16h";
  due_at: string;
  sent_at: string | null;
};

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function resolveOrder(
  s: ReturnType<typeof supabaseService>,
  rawOrderId: string
): Promise<{ order: Order | null; error: string | null }> {
  const key = rawOrderId.trim();

  if (!key) return { order: null, error: "Pedido não encontrado" };

  if (looksLikeUuid(key)) {
    const { data, error } = await s.from("orders").select("*").eq("id", key).maybeSingle();
    if (error) return { order: null, error: error.message };
    if (data) return { order: data as Order, error: null };
  }

  const { data, error } = await s.from("orders").select("*").eq("code", key).maybeSingle();
  if (error) return { order: null, error: error.message };
  if (!data) return { order: null, error: "Pedido não encontrado" };

  return { order: data as Order, error: null };
}

export async function GET(_req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const { orderId } = await ctx.params;
  const s = supabaseService();

  const { order, error: orderResolveErr } = await resolveOrder(s, orderId);
  if (orderResolveErr) return NextResponse.json({ error: orderResolveErr }, { status: 500 });
  if (!order) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

  const { data: items, error: iErr } = await s
    .from("order_items")
    .select("id,item_id,item_short_id,item_title,price")
    .eq("order_id", order.id)
    .order("id", { ascending: true });
  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  const { data: reminders, error: rErr } = await s
    .from("order_reminders")
    .select("id,kind,due_at,sent_at")
    .eq("order_id", order.id)
    .order("due_at", { ascending: true });
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  return NextResponse.json({
    order,
    items: (items ?? []) as OrderItem[],
    reminders: (reminders ?? []) as Reminder[],
  });
}

const ActionBody = z.object({
  action: z.enum(["mark_paid", "mark_delivered", "cancel", "mark_reminder_sent"]),
  reminder_id: z.string().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const { orderId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = ActionBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const s = supabaseService();
  const now = new Date().toISOString();

  const { order, error: orderResolveErr } = await resolveOrder(s, orderId);
  if (orderResolveErr) return NextResponse.json({ error: orderResolveErr }, { status: 500 });
  if (!order) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

  if (parsed.data.action === "mark_reminder_sent") {
    if (!parsed.data.reminder_id) {
      return NextResponse.json({ error: "reminder_id obrigatório" }, { status: 400 });
    }

    const { error } = await s
      .from("order_reminders")
      .update({ sent_at: now })
      .eq("id", parsed.data.reminder_id)
      .eq("order_id", order.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { data: oi, error: oiErr } = await s.from("order_items").select("item_id").eq("order_id", order.id);
  if (oiErr) return NextResponse.json({ error: oiErr.message }, { status: 500 });
  const itemIds = (oi ?? []).map((r) => (r as { item_id: string }).item_id);

  if (parsed.data.action === "mark_paid") {
    const { error } = await s.from("orders").update({ status: "paid", paid_at: now }).eq("id", order.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "mark_delivered") {
    const { error: oErr } = await s
      .from("orders")
      .update({ status: "delivered", delivered_at: now })
      .eq("id", order.id);
    if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

    if (itemIds.length) {
      const { error: iErr } = await s.from("items").update({ status: "sold" }).in("id", itemIds);
      if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  const { error: cErr } = await s
    .from("orders")
    .update({ status: "cancelled", cancelled_at: now })
    .eq("id", order.id);
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  if (itemIds.length) {
    const { error: iErr } = await s.from("items").update({ status: "available" }).in("id", itemIds);
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}