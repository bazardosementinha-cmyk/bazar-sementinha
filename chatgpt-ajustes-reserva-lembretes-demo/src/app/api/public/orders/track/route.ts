import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabase/service";

type PaymentPlan = "pix_now" | "card_pickup_deposit" | "pay_pickup_24h";

const PIX_FAVORED = "Templo de Umbanda Caboclo Sete Flexa";
const SUPPORT_WA = "5519992360856";

const Body = z
  .object({
    code: z.string().min(4),
    token: z.string().optional(),
    whatsapp: z.string().optional(),
    email: z.string().optional(),
  })
  .refine((data) => Boolean(data.token || data.whatsapp || data.email), {
    message: "Informe o link seguro, WhatsApp ou e-mail.",
  });

function onlyDigits(value: string) {
  return value.replace(/\D+/g, "");
}

function normalizeWhatsApp(raw: string) {
  const digits = onlyDigits(raw);
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase();
}

function getTrackingSecret() {
  return (
    process.env.ORDER_TRACKING_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "bazar-sementinha-dev-secret"
  );
}

function makeTrackingToken(code: string, whatsapp: string) {
  return createHmac("sha256", getTrackingSecret())
    .update(`${normalizeCode(code)}:${normalizeWhatsApp(whatsapp)}`)
    .digest("hex")
    .slice(0, 24);
}

function safeTokenEquals(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const code = normalizeCode(parsed.data.code);
  const token = parsed.data.token?.trim() || null;
  const whatsapp = parsed.data.whatsapp?.trim() || null;
  const email = parsed.data.email?.trim() || null;

  const s = supabaseService();

  const { data: order, error: orderErr } = await s
    .from("orders")
    .select(
      "id,code,status,total,created_at,expires_at,pickup_deadline_at,payment_plan,deposit_amount,deposit_required,deposit_paid,paid_at,delivered_at,cancelled_at,pix_key,pickup_location,customer_name,customer_email,customer_whatsapp"
    )
    .eq("code", code)
    .maybeSingle();

  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

  let authorized = false;

  if (token && order.customer_whatsapp) {
    const expected = makeTrackingToken(order.code as string, order.customer_whatsapp as string);
    authorized = safeTokenEquals(token, expected);
  }

  if (!authorized && whatsapp && order.customer_whatsapp) {
    authorized = normalizeWhatsApp(whatsapp) === normalizeWhatsApp(order.customer_whatsapp as string);
  }

  if (!authorized && email && order.customer_email) {
    authorized = normalizeEmail(email) === normalizeEmail(order.customer_email as string);
  }

  if (!authorized) {
    return NextResponse.json(
      { error: "Não foi possível validar o acesso ao pedido. Confira o código e o WhatsApp/e-mail." },
      { status: 401 }
    );
  }

  const { data: items, error: itemsErr } = await s
    .from("order_items")
    .select("item_short_id,item_title,price")
    .eq("order_id", order.id)
    .order("id", { ascending: true });

  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    order: {
      code: order.code as string,
      status: order.status as string,
      total: Number(order.total) || 0,
      created_at: (order.created_at as string | null) ?? null,
      expires_at: (order.expires_at as string | null) ?? null,
      pickup_deadline_at: (order.pickup_deadline_at as string | null) ?? null,
      payment_plan: (order.payment_plan as PaymentPlan) ?? "pix_now",
      deposit_amount: (order.deposit_amount as number | null) ?? null,
      deposit_required: Boolean(order.deposit_required),
      deposit_paid: Boolean(order.deposit_paid),
      paid_at: (order.paid_at as string | null) ?? null,
      delivered_at: (order.delivered_at as string | null) ?? null,
      cancelled_at: (order.cancelled_at as string | null) ?? null,
      pix_key: (order.pix_key as string | null) ?? null,
      pickup_location: (order.pickup_location as string | null) ?? null,
      customer_name: (order.customer_name as string | null) ?? null,
    },
    items: (items ?? []).map((it) => ({
      short_id: (it as { item_short_id: string }).item_short_id,
      title: (it as { item_title: string }).item_title,
      price: Number((it as { price: number }).price) || 0,
    })),
    support: {
      whatsapp: SUPPORT_WA,
      pix_favored: PIX_FAVORED,
    },
  });
}
