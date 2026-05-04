import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { buildReminderEmail, type MailOrder, type MailOrderItem } from "@/lib/order-notifications";
import { sendMail } from "@/lib/mail";

export type TestReminderKindInput = "8h" | "16h" | "remind_8h" | "remind_16h" | string | null | undefined;

type TestReminderKind = "remind_8h" | "remind_16h";

type OrderRow = {
  id: string;
  code: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_whatsapp: string | null;
  total: number | null;
  pix_key: string | null;
  pickup_location: string | null;
  expires_at: string | null;
  pickup_deadline_at: string | null;
  status: string | null;
  payment_status?: string | null;
  payment_proof_uploaded_at?: string | null;
  paid_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
};

type OrderItemRow = {
  order_id: string;
  item_id: string | null;
  item_short_id: string | null;
  item_title: string | null;
  price: number | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLOSED_ORDER_STATUSES = new Set(["paid", "delivered", "cancelled", "canceled", "expired", "sold"]);
const CLOSED_PAYMENT_STATUSES = new Set(["submitted", "proof_submitted", "paid", "confirmed", "payment_confirmed"]);

function normalizeKind(kind: TestReminderKindInput): TestReminderKind | null {
  const raw = String(kind || "").trim().toLowerCase();
  if (raw === "8h" || raw === "remind_8h" || raw === "reminder_8h") return "remind_8h";
  if (raw === "16h" || raw === "remind_16h" || raw === "reminder_16h") return "remind_16h";
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

function toMailItems(rows: OrderItemRow[]): MailOrderItem[] {
  return rows.map((row) => ({
    item_short_id: row.item_short_id || String(row.item_id || ""),
    item_title: row.item_title || "Item do pedido",
    price: Number(row.price) || 0,
  }));
}

function isClosedForReminder(order: OrderRow): { closed: boolean; reason?: string } {
  const status = String(order.status || "").trim().toLowerCase();
  const paymentStatus = String(order.payment_status || "").trim().toLowerCase();

  if (CLOSED_ORDER_STATUSES.has(status)) {
    return { closed: true, reason: `Pedido com status ${status}. Lembrete não deve ser enviado.` };
  }

  if (CLOSED_PAYMENT_STATUSES.has(paymentStatus)) {
    return { closed: true, reason: `Pedido com payment_status ${paymentStatus}. Lembrete não deve ser enviado.` };
  }

  if (order.payment_proof_uploaded_at) {
    return { closed: true, reason: "Pedido já possui comprovante enviado. Lembrete não deve ser enviado." };
  }

  if (order.paid_at) {
    return { closed: true, reason: "Pedido já possui pagamento confirmado. Lembrete não deve ser enviado." };
  }

  return { closed: false };
}

async function loadOrder(orderIdOrCode: string) {
  const s = supabaseService();
  const value = orderIdOrCode.trim();
  const select = "id,code,customer_name,customer_email,customer_whatsapp,total,pix_key,pickup_location,expires_at,pickup_deadline_at,status,payment_status,payment_proof_uploaded_at,paid_at,delivered_at,cancelled_at";

  // Quando for UUID, tentamos primeiro por id. Quando for código ORD-XXXXX, a coluna correta é code.
  if (UUID_RE.test(value)) {
    const { data, error } = await s.from("orders").select(select).eq("id", value).maybeSingle();
    if (error) return { order: null as OrderRow | null, error: error.message, lookupTried: ["id"] };
    if (data) return { order: data as OrderRow, error: null as string | null, lookupTried: ["id"] };

    const byCode = await s.from("orders").select(select).eq("code", value).maybeSingle();
    if (byCode.error) return { order: null as OrderRow | null, error: byCode.error.message, lookupTried: ["id", "code"] };
    return { order: (byCode.data as OrderRow | null) ?? null, error: null as string | null, lookupTried: ["id", "code"] };
  }

  const { data, error } = await s.from("orders").select(select).eq("code", value).maybeSingle();
  if (error) return { order: null as OrderRow | null, error: error.message, lookupTried: ["code"] };
  return { order: (data as OrderRow | null) ?? null, error: null as string | null, lookupTried: ["code"] };
}

async function loadOrderItems(orderId: string): Promise<{ items: MailOrderItem[]; error: string | null }> {
  const s = supabaseService();
  const { data, error } = await s
    .from("order_items")
    .select("order_id,item_id,item_short_id,item_title,price")
    .eq("order_id", orderId)
    .order("item_short_id", { ascending: true });

  if (error) return { items: [], error: error.message };
  return { items: toMailItems((data ?? []) as OrderItemRow[]), error: null };
}

async function maybeMarkReminderAsSent(orderId: string, kind: TestReminderKind) {
  const s = supabaseService();
  const nowIso = new Date().toISOString();
  const { data, error } = await s
    .from("order_reminders")
    .update({ sent_at: nowIso })
    .eq("order_id", orderId)
    .eq("kind", kind)
    .is("sent_at", null)
    .select("id,kind,sent_at");

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, reminders: data ?? [] };
}

export async function sendAdminTestReminder(orderIdOrCode: string, rawKind: unknown, markSent = false) {
  const kind = normalizeKind(rawKind as TestReminderKindInput);
  if (!kind) {
    return NextResponse.json(
      { ok: false, error: "kind inválido. Use '8h', '16h', 'remind_8h' ou 'remind_16h'.", receivedKind: rawKind },
      { status: 400 }
    );
  }

  const loaded = await loadOrder(orderIdOrCode);
  if (loaded.error) {
    return NextResponse.json(
      { ok: false, error: loaded.error, receivedOrderId: orderIdOrCode, lookupTried: loaded.lookupTried },
      { status: 500 }
    );
  }

  if (!loaded.order) {
    return NextResponse.json(
      {
        ok: false,
        error: "Pedido não encontrado.",
        receivedOrderId: orderIdOrCode,
        lookupTried: loaded.lookupTried,
        hint: "Para código como ORD-49CZZV, a busca usa orders.code. Para UUID, a busca usa orders.id.",
      },
      { status: 404 }
    );
  }

  const order = loaded.order;
  const closed = isClosedForReminder(order);
  if (closed.closed) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: closed.reason,
      order: { id: order.id, code: order.code, status: order.status, payment_status: order.payment_status },
    });
  }

  if (!order.customer_email) {
    return NextResponse.json(
      { ok: false, error: "Pedido sem customer_email. Não há destinatário para o teste.", order: { id: order.id, code: order.code } },
      { status: 400 }
    );
  }

  const itemLoad = await loadOrderItems(order.id);
  if (itemLoad.error) {
    return NextResponse.json({ ok: false, error: itemLoad.error, step: "load_order_items", order: { id: order.id, code: order.code } }, { status: 500 });
  }

  const mail = buildReminderEmail(toMailOrder(order), kind, itemLoad.items);
  const label = kind === "remind_8h" ? "8h" : "16h";
  const sendResult = await sendMail({
    to: order.customer_email,
    cc: mail.cc,
    subject: `[TESTE] ${mail.subject}`,
    text: [`[TESTE DE LEMBRETE ${label}]`, "", mail.text].join("\n"),
    html: `<p><strong>[TESTE DE LEMBRETE ${label}]</strong></p>${mail.html || ""}`,
  });

  if (!sendResult.ok) {
    return NextResponse.json(
      { ok: false, email_sent: false, error: sendResult.error, code: sendResult.code, order: { id: order.id, code: order.code } },
      { status: 500 }
    );
  }

  const markResult = markSent ? await maybeMarkReminderAsSent(order.id, kind) : null;

  return NextResponse.json({
    ok: true,
    email_sent: true,
    test: true,
    kind,
    order_code: order.code,
    order_id: order.id,
    to: order.customer_email,
    cc: mail.cc || null,
    messageId: sendResult.messageId,
    response: sendResult.response,
    mark_sent: Boolean(markSent),
    mark_result: markResult,
  });
}
