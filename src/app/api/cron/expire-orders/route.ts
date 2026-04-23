import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { buildCancellationEmail, buildReminderEmail, type MailOrder, type MailOrderItem } from "@/lib/order-notifications";
import { sendMail } from "@/lib/mail";

export const runtime = "nodejs";

type ReminderRow = {
  id: string;
  order_id: string;
  kind: "remind_8h" | "remind_16h";
  due_at: string;
  sent_at: string | null;
};

type OrderRow = {
  id: string;
  code: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_whatsapp: string | null;
  total: number;
  pix_key: string | null;
  pickup_location: string | null;
  expires_at: string | null;
  pickup_deadline_at: string | null;
  status: string;
};

type OrderItemRow = {
  order_id: string;
  item_id: string;
  item_short_id: string;
  item_title: string;
  price: number;
};

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

function groupItems(rows: OrderItemRow[]): Record<string, MailOrderItem[]> {
  return rows.reduce<Record<string, MailOrderItem[]>>((acc, row) => {
    if (!acc[row.order_id]) acc[row.order_id] = [];
    acc[row.order_id].push({
      item_short_id: row.item_short_id,
      item_title: row.item_title,
      price: Number(row.price) || 0,
    });
    return acc;
  }, {});
}

async function processReminderEmails(s: ReturnType<typeof supabaseService>, nowIso: string) {
  const { data: reminders, error: remindersErr } = await s
    .from("order_reminders")
    .select("id,order_id,kind,due_at,sent_at")
    .is("sent_at", null)
    .lte("due_at", nowIso)
    .limit(200);

  if (remindersErr) return { processed: 0, sent: 0, errors: [remindersErr.message] };

  const pending = (reminders ?? []) as ReminderRow[];
  if (!pending.length) return { processed: 0, sent: 0, errors: [] as string[] };

  const orderIds = Array.from(new Set(pending.map((r) => r.order_id)));

  const { data: orders, error: ordersErr } = await s
    .from("orders")
    .select("id,code,customer_name,customer_email,customer_whatsapp,total,pix_key,pickup_location,expires_at,pickup_deadline_at,status")
    .in("id", orderIds);

  if (ordersErr) return { processed: pending.length, sent: 0, errors: [ordersErr.message] };

  const { data: items, error: itemsErr } = await s
    .from("order_items")
    .select("order_id,item_id,item_short_id,item_title,price")
    .in("order_id", orderIds);

  if (itemsErr) return { processed: pending.length, sent: 0, errors: [itemsErr.message] };

  const ordersById = new Map(((orders ?? []) as OrderRow[]).map((order) => [order.id, order]));
  const itemsByOrder = groupItems((items ?? []) as OrderItemRow[]);

  let sent = 0;
  const errors: string[] = [];

  for (const reminder of pending) {
    const order = ordersById.get(reminder.order_id);
    if (!order) continue;
    if (order.status !== "reserved") continue;
    if (!order.customer_email) continue;

    const mail = buildReminderEmail(toMailOrder(order), reminder.kind, itemsByOrder[order.id] ?? []);
    const result = await sendMail({
      to: order.customer_email,
      cc: mail.cc,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    if (!result.ok) {
      errors.push(`Lembrete ${reminder.id}: ${result.error}`);
      continue;
    }

    const { error: updErr } = await s
      .from("order_reminders")
      .update({ sent_at: nowIso })
      .eq("id", reminder.id);

    if (updErr) {
      errors.push(`Lembrete ${reminder.id}: ${updErr.message}`);
      continue;
    }

    sent += 1;
  }

  return { processed: pending.length, sent, errors };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ua = req.headers.get("user-agent") || "";
  const isVercelCron = ua.includes("vercel-cron/1.0");

  const secret = url.searchParams.get("secret") || req.headers.get("x-cron-secret") || "";
  const expected = process.env.CRON_SECRET || "";
  const ok = isVercelCron || (expected && secret === expected);

  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const s = supabaseService();
  const nowIso = new Date().toISOString();

  const reminderResult = await processReminderEmails(s, nowIso);

  const { data: orders, error: oErr } = await s
    .from("orders")
    .select("id,code,customer_name,customer_email,customer_whatsapp,total,pix_key,pickup_location,expires_at,pickup_deadline_at,status")
    .eq("status", "reserved")
    .lte("expires_at", nowIso)
    .limit(200);

  if (oErr) {
    return NextResponse.json({ error: oErr.message, reminders: reminderResult }, { status: 500 });
  }

  const expiredOrders = (orders ?? []) as OrderRow[];
  const ids = expiredOrders.map((r) => r.id);
  if (!ids.length) {
    return NextResponse.json({ ok: true, expired: 0, reminders: reminderResult });
  }

  const { data: oi, error: oiErr } = await s
    .from("order_items")
    .select("order_id,item_id,item_short_id,item_title,price")
    .in("order_id", ids);
  if (oiErr) return NextResponse.json({ error: oiErr.message, reminders: reminderResult }, { status: 500 });

  const orderItems = (oi ?? []) as OrderItemRow[];
  const itemIds = orderItems.map((r) => r.item_id);
  const itemsByOrder = groupItems(orderItems);

  const { error: cErr } = await s
    .from("orders")
    .update({ status: "cancelled", cancelled_at: nowIso })
    .in("id", ids);
  if (cErr) return NextResponse.json({ error: cErr.message, reminders: reminderResult }, { status: 500 });

  if (itemIds.length) {
    const { error: iErr } = await s
      .from("items")
      .update({ status: "available" })
      .in("id", itemIds)
      .eq("status", "reserved");
    if (iErr) return NextResponse.json({ error: iErr.message, reminders: reminderResult }, { status: 500 });
  }

  let cancelEmailsSent = 0;
  const cancelEmailErrors: string[] = [];

  for (const order of expiredOrders) {
    if (!order.customer_email) continue;
    const mail = buildCancellationEmail(toMailOrder(order), itemsByOrder[order.id] ?? []);
    const result = await sendMail({
      to: order.customer_email,
      cc: mail.cc,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    if (result.ok) {
      cancelEmailsSent += 1;
    } else {
      cancelEmailErrors.push(`Pedido ${order.code}: ${result.error}`);
    }
  }

  return NextResponse.json({
    ok: true,
    expired: ids.length,
    reminders: reminderResult,
    cancel_emails_sent: cancelEmailsSent,
    cancel_email_errors: cancelEmailErrors,
  });
}
