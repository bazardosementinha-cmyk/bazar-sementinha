export type OrderReminderKind = "remind_8h" | "remind_16h";
export type OrderNotificationKind = OrderReminderKind | "cancel_24h";
export type PaymentPlanForReminders = "pix_now" | "card_pickup_deposit" | string | null | undefined;

export type OrderReminderRow = {
  order_id: string;
  kind: OrderReminderKind;
  due_at: string;
};

export type DisplayReminder = {
  id: string;
  kind: OrderReminderKind;
  due_at: string;
  sent_at: string | null;
};

export const ORDER_REMINDER_OFFSETS: Array<{
  kind: OrderReminderKind;
  label: string;
  offsetHoursAfterCreation: number;
}> = [
  { kind: "remind_8h", label: "8h", offsetHoursAfterCreation: 8 },
  { kind: "remind_16h", label: "16h", offsetHoursAfterCreation: 16 },
];

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function getReminderLabel(kind: OrderReminderKind | string): string {
  if (kind === "remind_8h" || kind === "8h") return "8h";
  if (kind === "remind_16h" || kind === "16h") return "16h";
  if (kind === "cancel_24h") return "Cancelamento 24h";
  return String(kind);
}

export function getReminderOffsetHours(kind: OrderReminderKind | string): number | null {
  if (kind === "remind_8h" || kind === "8h") return 8;
  if (kind === "remind_16h" || kind === "16h") return 16;
  return null;
}

export function shouldScheduleOrderReminders(paymentPlan: PaymentPlanForReminders): boolean {
  return paymentPlan !== "card_pickup_deposit";
}

export function buildOrderReminderRows(
  orderId: string,
  createdAt: Date,
  paymentPlan: PaymentPlanForReminders
): OrderReminderRow[] {
  if (!shouldScheduleOrderReminders(paymentPlan)) return [];

  return ORDER_REMINDER_OFFSETS.map((reminder) => ({
    order_id: orderId,
    kind: reminder.kind,
    due_at: addHours(createdAt, reminder.offsetHoursAfterCreation).toISOString(),
  }));
}

export function sortOrderReminders<T extends { due_at: string; kind: string }>(reminders: T[]): T[] {
  return [...reminders].sort((a, b) => {
    const aMs = new Date(a.due_at).getTime();
    const bMs = new Date(b.due_at).getTime();

    if (Number.isFinite(aMs) && Number.isFinite(bMs) && aMs !== bMs) return aMs - bMs;

    const aOffset = getReminderOffsetHours(a.kind) ?? Number.MAX_SAFE_INTEGER;
    const bOffset = getReminderOffsetHours(b.kind) ?? Number.MAX_SAFE_INTEGER;
    return aOffset - bOffset;
  });
}
