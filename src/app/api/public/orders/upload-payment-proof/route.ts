import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import {
  PAYMENT_PROOF_BUCKET,
  buildPaymentProofPath,
  canUploadPaymentProof,
  makeTrackingToken,
  normalizeEmail,
  normalizeOrderCode,
  safeTokenEquals,
  validatePaymentProofFile,
} from "@/lib/payment-proof";
import { normalizeWhatsApp } from "@/lib/order-links";
import { sendMail } from "@/lib/mail";
import { buildPaymentProofSubmittedEmail, type MailOrder, type MailOrderItem } from "@/lib/order-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderRow = MailOrder & {
  id: string;
  status: string;
  payment_status?: string | null;
};

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isAuthorized(order: OrderRow, params: { token: string; whatsapp: string; email: string }) {
  if (params.token && order.customer_whatsapp) {
    const expected = makeTrackingToken(order.code, order.customer_whatsapp);
    if (safeTokenEquals(params.token, expected)) return true;
  }

  if (params.whatsapp && order.customer_whatsapp) {
    if (normalizeWhatsApp(params.whatsapp) === normalizeWhatsApp(order.customer_whatsapp)) return true;
  }

  if (params.email && order.customer_email) {
    if (normalizeEmail(params.email) === normalizeEmail(order.customer_email)) return true;
  }

  return false;
}

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  const code = normalizeOrderCode(getFormString(formData, "code"));
  const token = getFormString(formData, "token");
  const whatsapp = getFormString(formData, "whatsapp");
  const email = getFormString(formData, "email");
  const fileValue = formData.get("file");

  if (!code) return NextResponse.json({ error: "Código do pedido obrigatório." }, { status: 400 });
  if (!(fileValue instanceof File)) {
    return NextResponse.json({ error: "Arquivo do comprovante obrigatório." }, { status: 400 });
  }

  const fileError = validatePaymentProofFile(fileValue);
  if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });

  const s = supabaseService();

  const { data: orderData, error: orderErr } = await s
    .from("orders")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });
  if (!orderData) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

  const order = orderData as OrderRow;
  if (!isAuthorized(order, { token, whatsapp, email })) {
    return NextResponse.json({ error: "Não foi possível validar o acesso ao pedido." }, { status: 401 });
  }

  if (!canUploadPaymentProof(order.status, order.payment_status)) {
    return NextResponse.json({ error: "Este pedido não aceita novo envio de comprovante neste momento." }, { status: 409 });
  }

  const path = buildPaymentProofPath(order.id, fileValue);
  const buffer = Buffer.from(await fileValue.arrayBuffer());

  const { error: uploadErr } = await s.storage.from(PAYMENT_PROOF_BUCKET).upload(path, buffer, {
    contentType: fileValue.type,
    upsert: false,
  });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const uploadedAt = new Date().toISOString();

  const { error: updateErr } = await s
    .from("orders")
    .update({
      payment_status: "submitted",
      payment_proof_path: path,
      payment_proof_uploaded_at: uploadedAt,
      payment_proof_mime_type: fileValue.type,
      payment_proof_size_bytes: fileValue.size,
    })
    .eq("id", order.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  const { data: itemRows } = await s
    .from("order_items")
    .select("item_short_id,item_title,price")
    .eq("order_id", order.id)
    .order("id", { ascending: true });

  if (order.customer_email) {
    const mail = buildPaymentProofSubmittedEmail(order, (itemRows ?? []) as MailOrderItem[]);
    const mailResult = await sendMail({
      to: order.customer_email,
      cc: mail.cc,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    if (!mailResult.ok) {
      console.error("[payment-proof] Falha ao enviar e-mail de comprovante recebido", mailResult);
    }
  }

  return NextResponse.json({ ok: true, payment_status: "submitted", payment_proof_uploaded_at: uploadedAt });
}
