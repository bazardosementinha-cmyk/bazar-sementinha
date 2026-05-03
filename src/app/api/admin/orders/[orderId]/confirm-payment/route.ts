import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase/service";
import { sendMail } from "@/lib/mail";
import { buildPaymentConfirmedEmail, type MailOrder, type MailOrderItem } from "@/lib/order-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function confirmOrderPayment(orderId: string) {
  const s = supabaseService();
  const now = new Date().toISOString();

  const { data: orderData, error: orderErr } = await s.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (orderErr) return { status: 500, body: { error: orderErr.message } };
  if (!orderData) return { status: 404, body: { error: "Pedido não encontrado." } };

  const order = orderData as MailOrder & { id: string; status: string; payment_status?: string | null };

  if (order.status === "paid" || order.payment_status === "confirmed") {
    return { status: 200, body: { ok: true, already_confirmed: true } };
  }

  const { data: items } = await s
    .from("order_items")
    .select("item_short_id,item_title,price")
    .eq("order_id", order.id)
    .order("id", { ascending: true });

  const { error } = await s
    .from("orders")
    .update({ status: "paid", payment_status: "confirmed", paid_at: now })
    .eq("id", order.id);

  if (error) return { status: 500, body: { error: error.message } };

  if (order.customer_email) {
    const mail = buildPaymentConfirmedEmail({ ...order, status: "paid", payment_status: "confirmed", paid_at: now } as MailOrder, (items ?? []) as MailOrderItem[]);
    const mailResult = await sendMail({
      to: order.customer_email,
      cc: mail.cc,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    if (!mailResult.ok) {
      console.error("[confirm-payment] Falha ao enviar e-mail de pagamento confirmado", mailResult);
    }
  }

  return { status: 200, body: { ok: true } };
}

export async function POST(_req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const { orderId } = await ctx.params;
  const result = await confirmOrderPayment(orderId);
  return NextResponse.json(result.body, { status: result.status });
}
