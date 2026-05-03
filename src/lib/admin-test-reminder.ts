import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { buildReminderEmail, type MailOrder, type MailOrderItem } from "@/lib/order-notifications";
import { sendMail } from "@/lib/mail";

export type TestReminderKind = "remind_8h" | "remind_16h";

type OrderRow = {
  id: string;
  code: string;
  status: string | null;
  total: number | string | null;
  pix_key: string | null;
  pickup_location: string | null;
  expires_at: string | null;
  pickup_deadline_at: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_whatsapp: string | null;
  payment_status?: string | null;
};

type OrderItemRow = {
  item_short_id: string | null;
  item_title: string | null;
  price: number | string | null;
};

const CLOSED_ORDER_STATUSES = new Set(["paid", "delivered", "cancelled", "canceled", "expired"]);
const BLOCKING_PAYMENT_STATUSES = new Set(["submitted", "confirmed", "paid", "cancelled", "canceled"]);

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeKind(raw: unknown): TestReminderKind | null {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "8h" || value === "remind_8h" || value === "reminder_8h") return "remind_8h";
  if (value === "16h" || value === "remind_16h" || value === "reminder_16h") return "remind_16h";
  return null;
}

function toMailOrder(order: OrderRow): MailOrder {
  return {
    code: order.code,
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_whatsapp: order.customer_whatsapp,
    total: Number(order.total) || 0,
    pix_key: order.pix_key,
    pickup_location: order.pickup_location,
    expires_at: order.expires_at,
    pickup_deadline_at: order.pickup_deadline_at,
  };
}

function toMailItems(items: OrderItemRow[]): MailOrderItem[] {
  return items.map((item) => ({
    item_short_id: item.item_short_id || "ITEM",
    item_title: item.item_title || "Item do pedido",
    price: Number(item.price) || 0,
  }));
}

function canSendReminder(order: OrderRow) {
  const orderStatus = String(order.status ?? "").toLowerCase();
  const paymentStatus = String(order.payment_status ?? "").toLowerCase();
  if (CLOSED_ORDER_STATUSES.has(orderStatus)) return false;
  if (BLOCKING_PAYMENT_STATUSES.has(paymentStatus)) return false;
  return true;
}

async function getOrderByIdOrCode(orderIdOrCode: string) {
  const supabase = supabaseService();
  const key = orderIdOrCode.trim();

  if (!key) return { data: null as OrderRow | null, error: null };

  let query = supabase.from("orders").select("*");
  query = looksLikeUuid(key) ? query.eq("id", key) : query.eq("code", key.toUpperCase());

  const { data, error } = await query.maybeSingle();
  return { data: data as OrderRow | null, error };
}

export async function sendAdminTestReminder(orderIdOrCode: string, rawKind: unknown, markSent: boolean) {
  const kind = normalizeKind(rawKind);
  if (!kind) {
    return NextResponse.json({ ok: false, error: "Informe kind como 8h ou 16h." }, { status: 400 });
  }

  const supabase = supabaseService();
  const { data: order, error: orderError } = await getOrderByIdOrCode(orderIdOrCode);

  if (orderError) return NextResponse.json({ ok: false, error: orderError.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Pedido não encontrado.", orderIdOrCode }, { status: 404 });

  if (!order.customer_email) {
    return NextResponse.json({ ok: false, error: "Pedido sem e-mail do cliente.", order_code: order.code }, { status: 400 });
  }

  if (!canSendReminder(order)) {
    return NextResponse.json(
      {
        ok: false,
        skipped: true,
        reason: "Pedido já possui comprovante/pagamento ou está encerrado. Lembrete não deve ser enviado.",
        order_id: order.id,
        order_code: order.code,
        order_status: order.status,
        payment_status: order.payment_status ?? null,
      },
      { status: 409 }
    );
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from("order_items")
    .select("item_short_id,item_title,price")
    .eq("order_id", order.id);

  if (itemsError) return NextResponse.json({ ok: false, error: itemsError.message }, { status: 500 });

  const mail = buildReminderEmail(toMailOrder(order), kind, toMailItems((itemsData ?? []) as OrderItemRow[]));
  const sendResult = await sendMail({
    to: order.customer_email,
    cc: mail.cc,
    subject: `[TESTE] ${mail.subject}`,
    text: `[TESTE DE ENVIO MANUAL]\n\n${mail.text}`,
    html: `<p><strong>TESTE DE ENVIO MANUAL</strong></p>${mail.html}`,
  });

  if (!sendResult.ok) return NextResponse.json({ ok: false, error: sendResult.error }, { status: 500 });

  if (markSent) {
    const { error: reminderError } = await supabase
      .from("order_reminders")
      .update({ sent_at: new Date().toISOString() })
      .eq("order_id", order.id)
      .eq("kind", kind)
      .is("sent_at", null);

    if (reminderError) {
      return NextResponse.json({
        ok: true,
        email_sent: true,
        mark_sent_error: reminderError.message,
        order_id: order.id,
        order_code: order.code,
        kind,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    email_sent: true,
    test: true,
    kind,
    order_id: order.id,
    order_code: order.code,
    to: order.customer_email,
    cc: mail.cc ?? null,
  });
}
