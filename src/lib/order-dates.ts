export const ORDER_TIME_ZONE = "America/Sao_Paulo";
export const ORDER_LOCALE = "pt-BR";

export function parseOrderDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatOrderDateTime(value: string | Date | null | undefined): string {
  const date = parseOrderDate(value);
  if (!date) return value ? String(value) : "";

  return new Intl.DateTimeFormat(ORDER_LOCALE, {
    timeZone: ORDER_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function formatOrderDateTimeShort(value: string | Date | null | undefined): string {
  const date = parseOrderDate(value);
  if (!date) return value ? String(value) : "";

  return new Intl.DateTimeFormat(ORDER_LOCALE, {
    timeZone: ORDER_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function addHoursToOrderDate(value: string | Date, hours: number): Date {
  const date = parseOrderDate(value) ?? new Date();
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}
