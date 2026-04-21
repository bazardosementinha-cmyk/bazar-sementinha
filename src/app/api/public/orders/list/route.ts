import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabase/service";

type PaymentPlan = "pix_now" | "card_pickup_deposit" | "pay_pickup_24h";

type OrderRow = {
  id: string;
  code: string;
  status: string;
  total: number | string;
  created_at: string | null;
  expires_at: string | null;
  pickup_deadline_at: string | null;
  payment_plan: PaymentPlan | null;
  deposit_amount: number | null;
  deposit_required: boolean | null;
  deposit_paid: boolean | null;
  paid_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_whatsapp: string | null;
  pickup_location: string | null;
  pix_key: string | null;
};

type OrderItemRow = {
  order_id: string;
  item_short_id: string;
  item_title: string;
  price: number | string;
};

const PIX_FAVORED = "Templo de Umbanda Caboclo Sete Flexa";
const SUPPORT_WA = "5519992360856";

const Body = z.object({
  email: z.string().email(),
  whatsapp: z.string().min(8),
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
    .update(`${code.trim().toUpperCase()}:${normalizeWhatsApp(whatsapp)}`)
    .digest("hex")
    .slice(0, 24);
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Informe e-mail e WhatsApp válidos." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const whatsapp = normalizeWhatsApp(parsed.data.whatsapp);

  const s = supabaseService();

  const { data: orders, error: ordersErr } = await s
    .from("orders")
    .select(
      "id,code,status,total,created_at,expires_at,pickup_deadline_at,payment_plan,deposit_amount,deposit_required,deposit_paid,paid_at,delivered_at,cancelled_at,customer_name,customer_email,customer_whatsapp,pickup_location,pix_key"
    )
    .ilike("customer_email", email)
    .order("created_at", { ascending: false })
    .limit(100);

  if (ordersErr) {
    return NextResponse.json({ error: ordersErr.message }, { status: 500 });
  }

  const filteredOrders = ((orders ?? []) as OrderRow[]).filter((order) => {
    const orderWhatsapp = normalizeWhatsApp(order.customer_whatsapp || "");
    return orderWhatsapp === whatsapp;
  });

  if (!filteredOrders.length) {
    return NextResponse.json({ ok: true, customer: { email }, orders: [] });
  }

  const orderIds = filteredOrders.map((order) => order.id);

  const { data: orderItems, error: itemsErr } = await s
    .from("order_items")
    .select("order_id,item_short_id,item_title,price")
    .in("order_id", orderIds)
    .order("id", { ascending: true });

  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  const itemsByOrder = ((orderItems ?? []) as OrderItemRow[]).reduce<Record<string, OrderItemRow[]>>(
    (acc, row) => {
      if (!acc[row.order_id]) acc[row.order_id] = [];
      acc[row.order_id].push(row);
      return acc;
    },
    {}
  );

  return NextResponse.json({
    ok: true,
    customer: {
      email,
      whatsapp,
      name: filteredOrders[0]?.customer_name ?? null,
    },
    orders: filteredOrders.map((order) => ({
      code: order.code,
      status: order.status,
      total: Number(order.total) || 0,
      created_at: order.created_at,
      expires_at: order.expires_at,
      pickup_deadline_at: order.pickup_deadline_at,
      payment_plan: order.payment_plan ?? "pix_now",
      deposit_amount: order.deposit_amount,
      deposit_required: Boolean(order.deposit_required),
      deposit_paid: Boolean(order.deposit_paid),
      paid_at: order.paid_at,
      delivered_at: order.delivered_at,
      cancelled_at: order.cancelled_at,
      pickup_location: order.pickup_location,
      pix_key: order.pix_key,
      tracking_url: `/pedido?code=${encodeURIComponent(order.code)}&t=${encodeURIComponent(
        makeTrackingToken(order.code, order.customer_whatsapp || whatsapp)
      )}`,
      items: (itemsByOrder[order.id] ?? []).map((item) => ({
        short_id: item.item_short_id,
        title: item.item_title,
        price: Number(item.price) || 0,
      })),
    })),
    support: {
      whatsapp: SUPPORT_WA,
      pix_favored: PIX_FAVORED,
    },
  });
}
