import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase/service";
import { buildOrderReminderRows, sortOrderReminders } from "@/lib/order-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ orderId: string }> };

type OrderForReminders = {
  id: string;
  code: string;
  created_at: string;
  expires_at: string | null;
  pickup_deadline_at: string | null;
  payment_plan?: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function findOrder(orderIdOrCode: string): Promise<OrderForReminders | null> {
  const s = supabaseService();
  const column = isUuid(orderIdOrCode) ? "id" : "code";
  const { data, error } = await s
    .from("orders")
    .select("id,code,created_at,expires_at,pickup_deadline_at,payment_plan")
    .eq(column, orderIdOrCode)
    .maybeSingle();

  if (error) throw error;
  return (data as OrderForReminders | null) ?? null;
}

async function ensureRows(order: OrderForReminders) {
  const s = supabaseService();
  const deadline = order.pickup_deadline_at || order.expires_at;
  const rows = [
    ...buildOrderReminderRows(order.id, new Date(order.created_at), order.payment_plan || "pix_now"),
    ...(deadline ? [{ order_id: order.id, kind: "cancel_24h", due_at: new Date(deadline).toISOString() }] : []),
  ];

  if (!rows.length) return;

  const { error } = await s.from("order_reminders").upsert(rows, { onConflict: "order_id,kind", ignoreDuplicates: true });
  if (error) throw error;
}

export async function GET(_req: Request, ctx: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.reason }, { status: 401 });

  const { orderId } = await ctx.params;
  const order = await findOrder(orderId);
  if (!order) return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });

  await ensureRows(order);

  const s = supabaseService();
  const { data, error } = await s
    .from("order_reminders")
    .select("id,order_id,kind,due_at,sent_at,send_result,created_at,updated_at")
    .eq("order_id", order.id)
    .order("due_at", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, order: { id: order.id, code: order.code }, reminders: sortOrderReminders(data ?? []) });
}
