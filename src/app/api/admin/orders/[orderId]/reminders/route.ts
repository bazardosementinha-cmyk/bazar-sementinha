import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase/service";
import { findOrderForNotification } from "@/lib/order-notification-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.reason }, { status: 401 });

  const { orderId } = await ctx.params;
  const order = await findOrderForNotification(orderId);
  if (!order) return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });

  const s = supabaseService();
  const { data, error } = await s
    .from("order_reminders")
    .select("order_id,kind,due_at,sent_at,send_result,created_at,updated_at")
    .eq("order_id", order.id)
    .order("due_at", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, order: { id: order.id, code: order.code }, reminders: data ?? [] });
}

export async function POST(req: Request, ctx: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.reason }, { status: 401 });

  const { orderId } = await ctx.params;
  const order = await findOrderForNotification(orderId);
  if (!order) return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { kind?: string; action?: string };
  const kind = String(body.kind || "").trim();
  if (!kind) return NextResponse.json({ ok: false, error: "Informe kind." }, { status: 400 });

  const action = String(body.action || "mark_sent");
  const s = supabaseService();

  if (action === "mark_unsent") {
    const { error } = await s
      .from("order_reminders")
      .update({ sent_at: null, send_result: null })
      .eq("order_id", order.id)
      .eq("kind", kind);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, order: { id: order.id, code: order.code }, kind, action });
  }

  const { error } = await s
    .from("order_reminders")
    .update({ sent_at: new Date().toISOString(), send_result: { manual: true, source: "admin" } })
    .eq("order_id", order.id)
    .eq("kind", kind);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, order: { id: order.id, code: order.code }, kind, action: "mark_sent" });
}
