import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { supabaseService } from "@/lib/supabase/service";
import { normalizeWhatsApp } from "@/lib/order-links";

export const PAYMENT_PROOF_BUCKET = "payment-proofs";

export const PAYMENT_PROOF_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const PAYMENT_PROOF_MAX_BYTES = 8 * 1024 * 1024;

export type PaymentProofPublicInfo = {
  payment_status: string | null;
  payment_proof_uploaded_at: string | null;
  payment_proof_mime_type: string | null;
  payment_proof_size_bytes: number | null;
};

export type PaymentProofUploadResult = {
  path: string;
  uploadedAt: string;
  mimeType: string;
  sizeBytes: number;
};

export function normalizeOrderCode(raw: string): string {
  return String(raw || "").trim().toUpperCase();
}

export function normalizeEmail(raw: string): string {
  return String(raw || "").trim().toLowerCase();
}

export function getTrackingSecret() {
  return (
    process.env.ORDER_TRACKING_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "bazar-sementinha-dev-secret"
  );
}

export function makeTrackingToken(code: string, whatsapp: string) {
  return createHmac("sha256", getTrackingSecret())
    .update(`${normalizeOrderCode(code)}:${normalizeWhatsApp(whatsapp)}`)
    .digest("hex")
    .slice(0, 24);
}

export function safeTokenEquals(a: string, b: string) {
  const aBuf = Buffer.from(a || "");
  const bBuf = Buffer.from(b || "");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function fileExtensionFromMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

export function validatePaymentProofFile(file: File): string | null {
  if (!file) return "Arquivo obrigatório.";
  if (!PAYMENT_PROOF_ALLOWED_MIME_TYPES.has(file.type)) {
    return "Formato inválido. Envie imagem JPG, PNG, WEBP ou PDF.";
  }
  if (file.size <= 0) return "Arquivo vazio.";
  if (file.size > PAYMENT_PROOF_MAX_BYTES) return "Arquivo muito grande. O limite é 8 MB.";
  return null;
}

export function buildPaymentProofPath(orderId: string, file: File): string {
  const ext = fileExtensionFromMime(file.type);
  return `orders/${orderId}/${new Date().toISOString().slice(0, 10)}-${randomUUID()}.${ext}`;
}

export async function createPaymentProofSignedUrl(path: string | null | undefined, expiresInSeconds = 60 * 60 * 24 * 7) {
  if (!path) return null;
  const s = supabaseService();
  const { data, error } = await s.storage.from(PAYMENT_PROOF_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function canUploadPaymentProof(status: string, paymentStatus: string | null | undefined): boolean {
  if (["cancelled", "canceled", "expired", "delivered", "paid"].includes(status)) return false;
  if (["submitted", "confirmed"].includes(paymentStatus || "")) return false;
  return true;
}
