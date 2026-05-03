import { createHmac } from "node:crypto";

function onlyDigits(value: string): string {
  return value.replace(/\D+/g, "");
}

export function normalizeWhatsApp(raw: string): string {
  const digits = onlyDigits(raw || "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export function getTrackingSecret(): string {
  return (
    process.env.ORDER_TRACKING_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "bazar-sementinha-dev-secret"
  );
}

export function makeTrackingToken(code: string, whatsapp: string): string {
  const normalizedWhatsapp = normalizeWhatsApp(whatsapp);
  return createHmac("sha256", getTrackingSecret())
    .update(`${code}:${normalizedWhatsapp}`)
    .digest("hex")
    .slice(0, 24);
}

export function buildTrackingRelativeUrl(code: string, whatsapp: string): string {
  const token = makeTrackingToken(code, whatsapp);
  return `/pedido?code=${encodeURIComponent(code)}&t=${encodeURIComponent(token)}`;
}

export function getSiteBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_BASE_URL || "";
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelProjectProd = process.env.VERCEL_PROJECT_PRODUCTION_URL || "";
  if (vercelProjectProd) return `https://${vercelProjectProd.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  const vercelUrl = process.env.VERCEL_URL || "";
  if (vercelUrl) return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

export function buildTrackingAbsoluteUrl(code: string, whatsapp: string): string {
  return `${getSiteBaseUrl()}${buildTrackingRelativeUrl(code, whatsapp)}`;
}
