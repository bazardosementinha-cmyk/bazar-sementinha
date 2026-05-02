import { supabaseService } from "@/lib/supabase/service";
import { buildCancellationEmail, buildReminderEmail, type MailOrder, type MailOrderItem } from "@/lib/order-notifications";
import { sendMail } from "@/lib/mail";

export type OrderNotificationJobResult = {
  ok: boolean;
  now: string;
  reminders: {
    processed: number;
    sent: number;
    skipped: number;
    errors: string[];
  };
  cancellations: {
    processed: number;
    cancelled: number;
    releasedItems: number;
    emailsSent: number;
    emailErrors: string[];
    errors: string[];
  };
};

type SupabaseServiceClient = ReturnType<typeof supabaseService>;

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
  payment_status?: string | null;
};

type OrderItemRow = {
  order_id: string;
  item_id: string;
  item_short_id: string;
  item_title: string;
  price: number;
};

const ACTIVE_PAYMENT_STATUSES = new Set(["reserved", "pending", "awaiting_payment"]);
const CLOSED_ORDER_STATUSES = new Set(["paid", "delivered", "cancelled", "canceled", "expired"]);
const PROOF_SUBMITTED_PAYMENT_STATUSES = new Set(["submitted", "confirmed"]);

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

function isReminderEligible(order: OrderRow | undefined): order is OrderRow {
  if (!order) return false;
  if (CLOSED_ORDER_STATUSES.has(order.status)) return false;
  if (PROOF_SUBMITTED_PAYMENT_STATUSES.has(order.payment_status || "")) return false;
  return ACTIVE_PAYMENT_STATUSES.has(order.status);
}

function isCancellationEligible(order: OrderRow): boolean {
  if (CLOSED_ORDER_STATUSES.has(order.status)) return false;
  if (PROOF_SUBMITTED_PAYMENT_STATUSES.has(order.payment_status || "")) return false;
  return ACTIVE_PAYMENT_STATUSES.has(order.status);
}

type OrderItemsLoadResult = {
  itemsByOrder: Record<string, MailOrderItem[]>;
  itemRows: OrderItemRow[];
  error: string | null;
};

async function loadOrderItems(s: SupabaseServiceClient, orderIds: string[]): Promise<OrderItemsLoadResult> {
  if (!orderIds.length) {
    return {
      itemsByOrder: {},
      itemRows: [],
      error: null,
    };
  }

  const { data, error } = await s
    .from("order_items")
    .select("order_id,item_id,item_short_id,item_title,price")
    .in("order_id", orderIds);

  if (error) {
    return {
      itemsByOrder: {},
      itemRows: [],
      error: error.message,
    };
  }

  const itemRows = (data ?? []) as OrderItemRow[];

  return {
    itemsByOrder: groupItems(itemRows),
    itemRows,
    error: null,
  };
}

async function processReminderEmails(s: SupabaseServiceClient, nowIso: string) {
  const result = {
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: [] as string[],
  };

  const { data: reminders, error: remindersErr } = await s
    .from("order_reminders")
    .select("id,order_id,kind,due_at,sent_at")
    .is("sent_at", null)
    .lte("due_at", nowIso)
    .order("due_at", { ascending: true })
    .limit(200);

  if (remindersErr) {
    result.errors.push(remindersErr.message);
    return result;
  }

  const pending = (reminders ?? []) as ReminderRow[];
  result.processed = pending.length;
  if (!pending.length) return result;

  const orderIds = Array.from(new Set(pending.map((r) => r.order_id).filter(Boolean)));

  const { data: orders, error: ordersErr } = await s
    .from("orders")
    .select("id,code,customer_name,customer_email,customer_whatsapp,total,pix_key,pickup_location,expires_at,pickup_deadline_at,status,payment_status")
    .in("id", orderIds);

  if (ordersErr) {
    result.errors.push(ordersErr.message);
    return result;
  }

  const itemLoad = await loadOrderItems(s, orderIds);
  if (itemLoad.error) {
    result.errors.push(itemLoad.error);
    return result;
  }

  const ordersById = new Map(((orders ?? []) as OrderRow[]).map((order) => [order.id, order]));

  for (const reminder of pending) {
    const order = ordersById.get(reminder.order_id);

    if (!isReminderEligible(order)) {
      result.skipped += 1;
      continue;
    }

    if (!order.customer_email) {
      result.skipped += 1;
      continue;
    }

    const mail = buildReminderEmail(toMailOrder(order), reminder.kind, itemLoad.itemsByOrder[order.id] ?? []);
    const sendResult = await sendMail({
      to: order.customer_email,
      cc: mail.cc,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    if (!sendResult.ok) {
      result.errors.push(`Lembrete ${reminder.id} / pedido ${order.code}: ${sendResult.error}`);
      continue;
    }

    const { error: updateErr } = await s
      .from("order_reminders")
      .update({ sent_at: nowIso })
      .eq("id", reminder.id)
      .is("sent_at", null);

    if (updateErr) {
      result.errors.push(`Lembrete ${reminder.id} / pedido ${order.code}: ${updateErr.message}`);
      continue;
    }

    result.sent += 1;
  }

  return result;
}

async function processExpiredOrders(s: SupabaseServiceClient, nowIso: string) {
  const result = {
    processed: 0,
    cancelled: 0,
    releasedItems: 0,
    emailsSent: 0,
    emailErrors: [] as string[],
    errors: [] as string[],
  };

  const { data: orders, error: ordersErr } = await s
    .from("orders")
    .select("id,code,customer_name,customer_email,customer_whatsapp,total,pix_key,pickup_location,expires_at,pickup_deadline_at,status,payment_status")
    .in("status", Array.from(ACTIVE_PAYMENT_STATUSES))
    .lte("expires_at", nowIso)
    .order("expires_at", { ascending: true })
    .limit(200);

  if (ordersErr) {
    result.errors.push(ordersErr.message);
    return result;
  }

  const expiredOrders = ((orders ?? []) as OrderRow[]).filter(isCancellationEligible);
  result.processed = expiredOrders.length;
  if (!expiredOrders.length) return result;

  const orderIds = expiredOrders.map((order) => order.id);
  const itemLoad = await loadOrderItems(s, orderIds);
  if (itemLoad.error) {
    result.errors.push(itemLoad.error);
    return result;
  }

  const { error: updateOrdersErr } = await s
    .from("orders")
    .update({ status: "cancelled", cancelled_at: nowIso })
    .in("id", orderIds)
    .in("status", Array.from(ACTIVE_PAYMENT_STATUSES));

  if (updateOrdersErr) {
    result.errors.push(updateOrdersErr.message);
    return result;
  }

  result.cancelled = orderIds.length;

  const itemIds = Array.from(new Set(itemLoad.itemRows.map((row) => row.item_id).filter(Boolean)));
  if (itemIds.length) {
    const { data: releasedItems, error: releaseErr } = await s
      .from("items")
      .update({ status: "available" })
      .in("id", itemIds)
      .eq("status", "reserved")
      .select("id");

    if (releaseErr) {
      result.errors.push(releaseErr.message);
    } else {
      result.releasedItems = Array.isArray(releasedItems) ? releasedItems.length : 0;
    }
  }

  for (const order of expiredOrders) {
    if (!order.customer_email) continue;

    const mail = buildCancellationEmail(toMailOrder(order), itemLoad.itemsByOrder[order.id] ?? []);
    const sendResult = await sendMail({
      to: order.customer_email,
      cc: mail.cc,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    if (sendResult.ok) {
      result.emailsSent += 1;
    } else {
      result.emailErrors.push(`Pedido ${order.code}: ${sendResult.error}`);
    }
  }

  return result;
}

export async function processOrderNotificationJobs(now = new Date()): Promise<OrderNotificationJobResult> {
  const s = supabaseService();
  const nowIso = now.toISOString();

  console.info("[order-notification-jobs] Iniciando processamento", { now: nowIso });

  const reminders = await processReminderEmails(s, nowIso);
  const cancellations = await processExpiredOrders(s, nowIso);

  const ok = reminders.errors.length === 0 && cancellations.errors.length === 0 && cancellations.emailErrors.length === 0;

  const result: OrderNotificationJobResult = {
    ok,
    now: nowIso,
    reminders,
    cancellations,
  };

  console.info("[order-notification-jobs] Processamento concluido", result);

  return result;
}
