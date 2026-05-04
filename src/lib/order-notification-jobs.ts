import { supabaseService } from "@/lib/supabase/service";
import { sendMail } from "@/lib/mail";
import {
  buildCancellationEmail,
  buildReminderEmail,
  type MailOrder,
  type MailOrderItem,
} from "@/lib/order-notifications";
import {
  buildOrderReminderRows,
  type OrderReminderKind,
} from "@/lib/order-reminders";

export type OrderNotificationKind = OrderReminderKind | "cancel_24h";

export type ProcessOrderNotificationsOptions = {
  now?: Date;
  limit?: number;
  dryRun?: boolean;
  includeReminders?: boolean;
  includeCancellations?: boolean;
};

export type ProcessOrderNotificationsResult = {
  ok: boolean;
  now: string;
  dryRun: boolean;
  ensuredReminders: number;
  reminderCandidates: number;
  remindersSent: number;
  remindersSkipped: number;
  cancellationsCandidates: number;
  cancellationsSent: number;
  cancellationsSkipped: number;
  cancelledOrders: number;
  errors: Array<{ scope: string; message: string; details?: unknown }>;
  details: Array<Record<string, unknown>>;
};

type OrderRow = {
  id: string;
  code: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_whatsapp: string | null;
  total: number | string | null;
  pix_key: string | null;
  pickup_location: string | null;
  expires_at: string | null;
  pickup_deadline_at: string | null;
  created_at: string;
  status: string | null;
  payment_status: string | null;
  payment_proof_uploaded_at: string | null;
};

type ReminderRow = {
  order_id: string;
  kind: OrderNotificationKind;
  due_at: string;
  sent_at: string | null;
};

type OrderItemRow = {
  order_id: string;
  item_id?: string | null;
  item_short_id?: string | null;
  item_title?: string | null;
  price?: number | string | null;
  items?: { short_id?: string | null; title?: string | null; price?: number | string | null } | null;
};

const ACTIVE_ORDER_STATUS = new Set(["reserved"]);
const FINISHED_ORDER_STATUS = new Set(["paid", "delivered", "cancelled", "canceled", "expired", "sold"]);
const BLOCKING_PAYMENT_STATUS = new Set(["submitted", "confirmed", "paid", "payment_confirmed"]);
const REMINDER_KINDS: OrderReminderKind[] = ["remind_8h", "remind_16h"];

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  const maybe = error as { message?: unknown; error?: unknown };
  if (typeof maybe?.message === "string") return maybe.message;
  if (typeof maybe?.error === "string") return maybe.error;
  return String(error);
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function shouldSkipBecauseOrderClosed(order: OrderRow): string | null {
  const status = String(order.status || "").toLowerCase();
  const paymentStatus = String(order.payment_status || "").toLowerCase();

  if (FINISHED_ORDER_STATUS.has(status)) return `Pedido com status ${status}; não envia lembrete.`;
  if (!ACTIVE_ORDER_STATUS.has(status)) return `Pedido não está reservado/status ativo (${status || "sem status"}).`;
  if (BLOCKING_PAYMENT_STATUS.has(paymentStatus)) return `Pedido com payment_status ${paymentStatus}; não envia lembrete.`;
  if (order.payment_proof_uploaded_at) return "Pedido já possui comprovante enviado; não envia lembrete.";

  return null;
}

function orderDeadline(order: OrderRow): string | null {
  return order.pickup_deadline_at || order.expires_at || null;
}

function toMailOrder(order: OrderRow): MailOrder {
  return {
    code: order.code,
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_whatsapp: order.customer_whatsapp,
    total: toNumber(order.total),
    pix_key: order.pix_key,
    pickup_location: order.pickup_location,
    expires_at: order.expires_at,
    pickup_deadline_at: order.pickup_deadline_at,
  };
}

function normalizeItems(rows: OrderItemRow[]): MailOrderItem[] {
  return rows.map((row) => ({
    item_short_id: row.item_short_id || row.items?.short_id || row.item_id || "ITEM",
    item_title: row.item_title || row.items?.title || "Item do pedido",
    price: toNumber(row.price ?? row.items?.price),
  }));
}

async function loadItemsByOrder(orderIds: string[]) {
  const s = supabaseService();
  const empty: Record<string, MailOrderItem[]> = {};
  if (!orderIds.length) return empty;

  const first = await s
    .from("order_items")
    .select("order_id,item_id,item_short_id,item_title,price")
    .in("order_id", orderIds);

  let rows: OrderItemRow[] | null = null;

  if (!first.error) {
    rows = (first.data ?? []) as OrderItemRow[];
  } else {
    const fallback = await s
      .from("order_items")
      .select("order_id,item_id,price,items(short_id,title,price)")
      .in("order_id", orderIds);

    if (fallback.error) throw fallback.error;
    rows = (fallback.data ?? []) as OrderItemRow[];
  }

  return rows.reduce<Record<string, MailOrderItem[]>>((acc, row) => {
    const key = row.order_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(...normalizeItems([row]));
    return acc;
  }, {});
}

async function loadOrdersByIds(orderIds: string[]): Promise<Record<string, OrderRow>> {
  const s = supabaseService();
  if (!orderIds.length) return {};

  const { data, error } = await s
    .from("orders")
    .select(
      "id,code,customer_name,customer_email,customer_whatsapp,total,pix_key,pickup_location,expires_at,pickup_deadline_at,created_at,status,payment_status,payment_proof_uploaded_at"
    )
    .in("id", orderIds);

  if (error) throw error;

  return ((data ?? []) as OrderRow[]).reduce<Record<string, OrderRow>>((acc, order) => {
    acc[order.id] = order;
    return acc;
  }, {});
}

export async function findOrderForNotification(orderIdOrCode: string): Promise<OrderRow | null> {
  const s = supabaseService();
  const input = orderIdOrCode.trim();
  const column = isUuid(input) ? "id" : "code";

  const { data, error } = await s
    .from("orders")
    .select(
      "id,code,customer_name,customer_email,customer_whatsapp,total,pix_key,pickup_location,expires_at,pickup_deadline_at,created_at,status,payment_status,payment_proof_uploaded_at"
    )
    .eq(column, input)
    .maybeSingle();

  if (error) throw error;
  return (data as OrderRow | null) ?? null;
}

async function ensureRemindersForActiveOrders(result: ProcessOrderNotificationsResult, now: Date, limit: number) {
  const s = supabaseService();

  const { data, error } = await s
    .from("orders")
    .select("id,created_at,status,payment_status,payment_proof_uploaded_at,expires_at,pickup_deadline_at")
    .eq("status", "reserved")
    .is("payment_proof_uploaded_at", null)
    .limit(limit);

  if (error) throw error;

  const orders = ((data ?? []) as Pick<
    OrderRow,
    "id" | "created_at" | "status" | "payment_status" | "payment_proof_uploaded_at" | "expires_at" | "pickup_deadline_at"
  >[]).filter((order) => {
    const paymentStatus = String(order.payment_status || "awaiting_proof").toLowerCase();
    return !BLOCKING_PAYMENT_STATUS.has(paymentStatus);
  });

  const rows = orders.flatMap((order) => {
    const reminders = buildOrderReminderRows(order.id, new Date(order.created_at), "pix_now");
    const deadline = order.pickup_deadline_at || order.expires_at;
    const cancellation = deadline
      ? [{ order_id: order.id, kind: "cancel_24h" as OrderNotificationKind, due_at: new Date(deadline).toISOString() }]
      : [];
    return [...reminders, ...cancellation];
  });

  if (!rows.length) return;

  const { error: upsertError } = await s
    .from("order_reminders")
    .upsert(rows, { onConflict: "order_id,kind", ignoreDuplicates: true });

  if (upsertError) throw upsertError;
  result.ensuredReminders += rows.length;
}

async function processDueReminders(result: ProcessOrderNotificationsResult, now: Date, limit: number) {
  const s = supabaseService();

  const { data, error } = await s
    .from("order_reminders")
    .select("order_id,kind,due_at,sent_at")
    .in("kind", REMINDER_KINDS)
    .is("sent_at", null)
    .lte("due_at", now.toISOString())
    .order("due_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const reminders = (data ?? []) as ReminderRow[];
  result.reminderCandidates = reminders.length;
  if (!reminders.length) return;

  const orderIds = Array.from(new Set(reminders.map((row) => row.order_id)));
  const ordersById = await loadOrdersByIds(orderIds);
  const itemsByOrder = await loadItemsByOrder(orderIds);

  for (const reminder of reminders) {
    const order = ordersById[reminder.order_id];

    if (!order) {
      result.remindersSkipped += 1;
      result.details.push({ kind: reminder.kind, order_id: reminder.order_id, skipped: true, reason: "Pedido não encontrado." });
      continue;
    }

    const skipReason = shouldSkipBecauseOrderClosed(order);
    if (skipReason) {
      result.remindersSkipped += 1;
      result.details.push({ kind: reminder.kind, order_code: order.code, skipped: true, reason: skipReason });
      continue;
    }

    if (!order.customer_email) {
      result.remindersSkipped += 1;
      result.details.push({ kind: reminder.kind, order_code: order.code, skipped: true, reason: "Pedido sem e-mail do cliente." });
      continue;
    }

    const mail = buildReminderEmail(toMailOrder(order), reminder.kind as OrderReminderKind, itemsByOrder[order.id] ?? []);

    if (result.dryRun) {
      result.details.push({ kind: reminder.kind, order_code: order.code, dryRun: true, to: order.customer_email, subject: mail.subject });
      continue;
    }

    const sendResult = await sendMail({
      to: order.customer_email,
      cc: mail.cc,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    if (!sendResult.ok) {
      result.errors.push({ scope: "reminder_send", message: sendResult.error, details: { order_code: order.code, kind: reminder.kind } });
      result.details.push({ kind: reminder.kind, order_code: order.code, sent: false, error: sendResult.error });
      continue;
    }

    const { error: updateError } = await s
      .from("order_reminders")
      .update({ sent_at: now.toISOString(), send_result: sendResult })
      .eq("order_id", reminder.order_id)
      .eq("kind", reminder.kind);

    if (updateError) {
      result.errors.push({ scope: "reminder_mark_sent", message: updateError.message, details: { order_code: order.code, kind: reminder.kind } });
      continue;
    }

    result.remindersSent += 1;
    result.details.push({ kind: reminder.kind, order_code: order.code, sent: true, messageId: sendResult.messageId });
  }
}

async function processDueCancellations(result: ProcessOrderNotificationsResult, now: Date, limit: number) {
  const s = supabaseService();

  const { data, error } = await s
    .from("order_reminders")
    .select("order_id,kind,due_at,sent_at")
    .eq("kind", "cancel_24h")
    .is("sent_at", null)
    .lte("due_at", now.toISOString())
    .order("due_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const rows = (data ?? []) as ReminderRow[];
  result.cancellationsCandidates = rows.length;
  if (!rows.length) return;

  const orderIds = Array.from(new Set(rows.map((row) => row.order_id)));
  const ordersById = await loadOrdersByIds(orderIds);
  const itemsByOrder = await loadItemsByOrder(orderIds);

  for (const row of rows) {
    const order = ordersById[row.order_id];

    if (!order) {
      result.cancellationsSkipped += 1;
      result.details.push({ kind: row.kind, order_id: row.order_id, skipped: true, reason: "Pedido não encontrado." });
      continue;
    }

    const paymentStatus = String(order.payment_status || "awaiting_proof").toLowerCase();
    const status = String(order.status || "").toLowerCase();

    if (FINISHED_ORDER_STATUS.has(status) || BLOCKING_PAYMENT_STATUS.has(paymentStatus) || order.payment_proof_uploaded_at) {
      result.cancellationsSkipped += 1;
      result.details.push({ kind: row.kind, order_code: order.code, skipped: true, reason: "Pedido já pago, encerrado ou com comprovante." });
      continue;
    }

    if (result.dryRun) {
      result.details.push({ kind: row.kind, order_code: order.code, dryRun: true, action: "cancel_order_and_release_items" });
      continue;
    }

    const mail = buildCancellationEmail(toMailOrder(order), itemsByOrder[order.id] ?? []);
    const sendResult = order.customer_email
      ? await sendMail({ to: order.customer_email, cc: mail.cc, subject: mail.subject, text: mail.text, html: mail.html })
      : ({ ok: true, response: "customer_without_email" } as const);

    if (!sendResult.ok) {
      result.errors.push({ scope: "cancellation_email", message: sendResult.error, details: { order_code: order.code } });
      continue;
    }

    const { error: updateOrderError } = await s
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id);

    if (updateOrderError) {
      result.errors.push({ scope: "cancel_order", message: updateOrderError.message, details: { order_code: order.code } });
      continue;
    }

    const { data: orderItemsForRelease, error: oiError } = await s
      .from("order_items")
      .select("item_id")
      .eq("order_id", order.id);

    if (!oiError) {
      const itemIds = ((orderItemsForRelease ?? []) as Array<{ item_id: string | null }>).map((item) => item.item_id).filter(Boolean) as string[];
      if (itemIds.length) {
        const { error: releaseError } = await s.from("items").update({ status: "available" }).in("id", itemIds);
        if (releaseError) {
          result.errors.push({ scope: "release_items", message: releaseError.message, details: { order_code: order.code, itemIds } });
        }
      }
    }

    const { error: markCancelError } = await s
      .from("order_reminders")
      .update({ sent_at: now.toISOString(), send_result: sendResult })
      .eq("order_id", order.id)
      .eq("kind", "cancel_24h");

    if (markCancelError) {
      result.errors.push({ scope: "mark_cancellation_sent", message: markCancelError.message, details: { order_code: order.code } });
    }

    result.cancelledOrders += 1;
    result.cancellationsSent += order.customer_email ? 1 : 0;
    result.details.push({ kind: row.kind, order_code: order.code, cancelled: true, emailSent: Boolean(order.customer_email) });
  }
}

export async function processOrderNotifications(options: ProcessOrderNotificationsOptions = {}): Promise<ProcessOrderNotificationsResult> {
  const now = options.now ?? new Date();
  const limit = Math.max(1, Math.min(options.limit ?? 50, 200));

  const result: ProcessOrderNotificationsResult = {
    ok: true,
    now: now.toISOString(),
    dryRun: Boolean(options.dryRun),
    ensuredReminders: 0,
    reminderCandidates: 0,
    remindersSent: 0,
    remindersSkipped: 0,
    cancellationsCandidates: 0,
    cancellationsSent: 0,
    cancellationsSkipped: 0,
    cancelledOrders: 0,
    errors: [],
    details: [],
  };

  try {
    await ensureRemindersForActiveOrders(result, now, limit);
  } catch (error) {
    result.errors.push({ scope: "ensure_reminders", message: errorMessage(error), details: error });
  }

  if (options.includeReminders !== false) {
    try {
      await processDueReminders(result, now, limit);
    } catch (error) {
      result.errors.push({ scope: "process_due_reminders", message: errorMessage(error), details: error });
    }
  }

  if (options.includeCancellations !== false) {
    try {
      await processDueCancellations(result, now, limit);
    } catch (error) {
      result.errors.push({ scope: "process_due_cancellations", message: errorMessage(error), details: error });
    }
  }

  result.ok = result.errors.length === 0;
  return result;
}
