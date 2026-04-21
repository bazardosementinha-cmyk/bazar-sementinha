import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

import { supabaseService } from "@/lib/supabase/service";

type PaymentPlan = "pix_now" | "card_pickup_deposit" | "pay_pickup_24h";

type ItemRow = {
  id: string;
  short_id: string;
  title: string;
  price: number;
  status: string;
};

type BodyCustomer = {
  name?: unknown;
  whatsapp?: unknown;
  email?: unknown;
  instagram?: unknown;
  opt_in_marketing?: unknown;
};

type Body = {
  cart_short_ids?: unknown;
  cart_ids?: unknown;
  customer?: unknown;
  payment_plan?: unknown;
};

const PIX_KEY = "58.392.598/0001-91";
const PIX_FAVORED = "Templo de Umbanda Caboclo Sete Flexa";
const SUPPORT_WA = "5519992360856";
const PICKUP_LOCATION = "TUCXA2";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return typeof err === "string" ? err : "Erro inesperado";
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x) => typeof x === "string") as string[];
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function onlyDigits(value: string): string {
  return value.replace(/\D+/g, "");
}

function normalizeWhatsApp(raw: string): string {
  const digits = onlyDigits(raw);
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function makeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "ORD-";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function pickPaymentPlan(value: unknown): PaymentPlan {
  const s = asString(value);
  if (s === "pix_now" || s === "card_pickup_deposit" || s === "pay_pickup_24h") return s;
  return "pix_now";
}

function computeDeadlines(plan: PaymentPlan) {
  const now = new Date();
  const hours24 = 24 * 60 * 60 * 1000;
  const days15 = 15 * 24 * 60 * 60 * 1000;

  if (plan === "card_pickup_deposit") {
    const pickupDeadline = new Date(now.getTime() + days15);
    return {
      expiresAt: pickupDeadline,
      pickupDeadlineAt: pickupDeadline,
      depositAmount: 10,
      depositRequired: true,
    };
  }

  const expiresAt = new Date(now.getTime() + hours24);
  return {
    expiresAt,
    pickupDeadlineAt: null as Date | null,
    depositAmount: null as number | null,
    depositRequired: false,
  };
}

function whatsappUrlForOrder(code: string, total: number) {
  const text =
    `Olá! Pedido ${code} criado no Bazar do Sementinha. ` +
    `Total: R$ ${formatBRL(total)}. ` +
    `Vou enviar o comprovante do Pix aqui (se aplicável) e combinar a retirada.`;
  return `https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(text)}`;
}

function buildReminderRows(orderId: string, expiresAt: Date, plan: PaymentPlan) {
  if (plan === "card_pickup_deposit") return [];

  const remind8 = new Date(expiresAt.getTime() - 8 * 60 * 60 * 1000);
  const remind16 = new Date(expiresAt.getTime() - 16 * 60 * 60 * 1000);

  return [
    { order_id: orderId, kind: "remind_8h", due_at: remind8.toISOString() },
    { order_id: orderId, kind: "remind_16h", due_at: remind16.toISOString() },
  ];
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
  const normalizedWhatsapp = normalizeWhatsApp(whatsapp);
  return createHmac("sha256", getTrackingSecret())
    .update(`${code}:${normalizedWhatsapp}`)
    .digest("hex")
    .slice(0, 24);
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const supabase = supabaseService();

    const raw = (await req.json().catch(() => null)) as Body | null;
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const cartShortIds = Array.from(
      new Set(
        [...asStringArray(raw.cart_short_ids), ...asStringArray(raw.cart_ids)]
          .map((x) => x.trim())
          .filter(Boolean)
      )
    );

    if (cartShortIds.length === 0) {
      return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
    }

    const customerRaw = raw.customer as BodyCustomer | undefined;
    const name = asString(customerRaw?.name)?.trim() ?? "";
    const whatsappRaw = asString(customerRaw?.whatsapp)?.trim() ?? "";
    const email = asString(customerRaw?.email)?.trim() || null;
    const instagram = asString(customerRaw?.instagram)?.trim() || null;
    const optInMarketing = asBoolean(customerRaw?.opt_in_marketing);

    if (!name) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    if (!whatsappRaw) return NextResponse.json({ error: "WhatsApp é obrigatório." }, { status: 400 });

    const whatsapp = normalizeWhatsApp(whatsappRaw);
    if (whatsapp.length < 12) {
      return NextResponse.json({ error: "WhatsApp inválido." }, { status: 400 });
    }

    const plan = pickPaymentPlan(raw.payment_plan);
    const { expiresAt, pickupDeadlineAt, depositAmount, depositRequired } = computeDeadlines(plan);

    const { data: items, error: itemsErr } = await supabase
      .from("items")
      .select("id, short_id, title, price, status")
      .in("short_id", cartShortIds);

    if (itemsErr) {
      return NextResponse.json({ error: getErrorMessage(itemsErr) }, { status: 500 });
    }

    const rows = (items ?? []) as ItemRow[];
    if (rows.length === 0) {
      return NextResponse.json({ error: "Nenhum item encontrado no carrinho." }, { status: 400 });
    }

    const available = rows.filter((it) => it.status === "available");
    if (available.length === 0) {
      return NextResponse.json({ error: "Nenhum item disponível no carrinho." }, { status: 400 });
    }

    const total = available.reduce((acc, it) => acc + (Number(it.price) || 0), 0);

    const { data: existingCustomer, error: custFindErr } = await supabase
      .from("customers")
      .select("id")
      .eq("whatsapp", whatsapp)
      .maybeSingle();

    if (custFindErr) {
      return NextResponse.json({ error: getErrorMessage(custFindErr) }, { status: 500 });
    }

    let customerId: string;

    if (existingCustomer?.id) {
      customerId = existingCustomer.id as string;

      const { error: custUpdErr } = await supabase
        .from("customers")
        .update({
          name,
          email,
          whatsapp,
          instagram,
          opt_in_marketing: optInMarketing,
        })
        .eq("id", customerId);

      if (custUpdErr) {
        return NextResponse.json({ error: getErrorMessage(custUpdErr) }, { status: 500 });
      }
    } else {
      const { data: createdCustomer, error: custInsErr } = await supabase
        .from("customers")
        .insert({
          name,
          whatsapp,
          email,
          instagram,
          opt_in_marketing: optInMarketing,
        })
        .select("id")
        .single();

      if (custInsErr || !createdCustomer?.id) {
        return NextResponse.json({ error: getErrorMessage(custInsErr) }, { status: 500 });
      }

      customerId = createdCustomer.id as string;
    }

    const code = makeCode();
    const trackingToken = makeTrackingToken(code, whatsapp);
    const trackingUrl = `/pedido?code=${encodeURIComponent(code)}&t=${encodeURIComponent(trackingToken)}`;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        code,
        customer_id: customerId,
        customer_name: name,
        customer_email: email,
        customer_whatsapp: whatsapp,
        customer_instagram: instagram,
        status: "reserved",
        total,
        pix_key: PIX_KEY,
        pickup_location: PICKUP_LOCATION,
        expires_at: expiresAt.toISOString(),
        payment_plan: plan,
        pickup_deadline_at: pickupDeadlineAt ? pickupDeadlineAt.toISOString() : null,
        deposit_amount: depositAmount,
        deposit_required: depositRequired,
        deposit_paid: false,
      })
      .select(
        "id, code, status, total, payment_plan, deposit_amount, deposit_required, expires_at, pickup_deadline_at"
      )
      .single();

    if (orderErr || !order?.id) {
      return NextResponse.json({ error: getErrorMessage(orderErr) }, { status: 500 });
    }

    const orderItemsPayload = available.map((it) => ({
      order_id: order.id,
      item_id: it.id,
      item_short_id: it.short_id,
      item_title: it.title,
      price: it.price,
    }));

    const { error: oiErr } = await supabase.from("order_items").insert(orderItemsPayload);
    if (oiErr) {
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: getErrorMessage(oiErr) }, { status: 500 });
    }

    const reminderRows = buildReminderRows(order.id as string, expiresAt, plan);
    if (reminderRows.length > 0) {
      const { error: remindersErr } = await supabase.from("order_reminders").insert(reminderRows);
      if (remindersErr) {
        await supabase.from("orders").delete().eq("id", order.id);
        return NextResponse.json({ error: getErrorMessage(remindersErr) }, { status: 500 });
      }
    }

    const { data: updatedItems, error: updErr } = await supabase
      .from("items")
      .update({ status: "reserved" })
      .in(
        "id",
        available.map((it) => it.id)
      )
      .eq("status", "available")
      .select("id");

    if (updErr) {
      await supabase
        .from("orders")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", order.id);

      return NextResponse.json({ error: getErrorMessage(updErr) }, { status: 500 });
    }

    const updatedCount = Array.isArray(updatedItems) ? updatedItems.length : 0;
    if (updatedCount !== available.length) {
      await supabase
        .from("orders")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", order.id);

      return NextResponse.json(
        { error: "Um ou mais itens ficaram indisponíveis durante o fechamento. Tente novamente." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id as string,
        code: order.code as string,
        status: order.status as string,
        total: Number(order.total) || total,
        payment_plan: plan,
        deposit_required: Boolean(order.deposit_required ?? depositRequired),
        deposit_amount: (order.deposit_amount as number | null) ?? depositAmount,
        expires_at: (order.expires_at as string | null) ?? null,
        pickup_deadline_at:
          (order.pickup_deadline_at as string | null) ??
          (pickupDeadlineAt ? pickupDeadlineAt.toISOString() : null),
        items: available.map((it) => ({
          short_id: it.short_id,
          title: it.title,
          price: it.price,
        })),
      },
      pix: { key: PIX_KEY, favored: PIX_FAVORED },
      whatsapp_url: whatsappUrlForOrder(order.code as string, total),
      tracking: {
        url: trackingUrl,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}