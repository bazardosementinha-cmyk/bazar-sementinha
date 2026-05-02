import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { getAdminEmailCopyTo } from "@/lib/email-config";
import { sendMail } from "@/lib/mail";
import { buildPaymentProofSubmittedEmail, type MailOrderItem } from "@/lib/order-notifications";
import {
  PAYMENT_PROOF_BUCKET,
  buildPaymentProofPath,
  canUploadPaymentProof,
  createPaymentProofSignedUrl,
  makeTrackingToken,
  normalizeEmail,
  normalizeOrderCode,
  safeTokenEquals,
  validatePaymentProofFile,
} from "@/lib/payment-proof";
import { normalizeWhatsApp } from "@/lib/order-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  code: string;
  status: string;
  total: number;
  pix_key: string | null;
  pickup_location: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_whatsapp: string | null;
  expires_at: string | null;
  pickup_deadline_at: string | null;
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
    .select(
      "id,code,status,total,pix_key,pickup_location,customer_name,customer_email,customer_whatsapp,expires_at,pickup_deadline_at,payment_status"
    )
    .eq("code", code)
    .maybeSingle();

  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });
  if (!orderData) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

  const order = orderData as OrderRow;
  if (!isAuthorized(order, { token, whatsapp, email })) {
    return NextResponse.json({ error: "Não foi possível validar o acesso ao pedido." }, { status: 401 });
  }

  if (!canUploadPaymentProof(order.status, order.payment_status)) {
    return NextResponse.json(
      { error: "Este pedido não aceita novo envio de comprovante neste momento." },
      { status: 409 }
    );
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

  const { data: items, error: itemsErr } = await s
    .from("order_items")
    .select("item_short_id,item_title,price")
    .eq("order_id", order.id)
    .order("id", { ascending: true });

  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

  const proofUrl = await createPaymentProofSignedUrl(path);
  const mailItems: MailOrderItem[] = (items ?? []).map((item) => ({
    item_short_id: (item as { item_short_id: string }).item_short_id,
    item_title: (item as { item_title: string }).item_title,
    price: Number((item as { price: number }).price) || 0,
  }));

  const adminEmail = getAdminEmailCopyTo();
  let emailNotification: "sent" | "skipped" | "failed" = "skipped";

  if (adminEmail) {
    const mail = buildPaymentProofSubmittedEmail({
      order: {
        id: order.id,
        code: order.code,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_whatsapp: order.customer_whatsapp,
        total: Number(order.total) || 0,
        pix_key: order.pix_key,
        pickup_location: order.pickup_location,
        expires_at: order.expires_at,
        pickup_deadline_at: order.pickup_deadline_at,
      },
      items: mailItems,
      proofUrl,
      proofFileName: fileValue.name,
      proofMimeType: fileValue.type,
      proofSizeBytes: fileValue.size,
    });

    const sendResult = await sendMail({
      to: adminEmail,
      cc: mail.cc,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    emailNotification = sendResult.ok ? "sent" : "failed";
    if (!sendResult.ok) {
      console.error("[payment-proof] Falha ao enviar e-mail do comprovante", {
        orderCode: order.code,
        error: sendResult.error,
        code: sendResult.code,
        responseCode: sendResult.responseCode,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    payment_status: "submitted",
    payment_proof_uploaded_at: uploadedAt,
    notifications: { email: emailNotification },
  });
}
