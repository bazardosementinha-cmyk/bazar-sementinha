import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";

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
const PICKUP_LOCATION = "TUCXA2 (Rua Francisco de Assis Pupo, 390 — Vila Industrial — Campinas/SP)";

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
  // Accepts formats like:
  // - "19 99236-0856" -> "5519992360856"
  // - "+55 19 99236-0856" -> "5519992360856"
  // - "5519992360856" -> "5519992360856"
  const digits = onlyDigits(raw);
  if (digits.startsWith("55")) return digits;
  // If user typed only DDD+number (10/11 digits), prefix Brazil
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
  let out = "";
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

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    const raw = (await req.json().catch(() => null)) as Body | null;
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const cartShortIds = Array.from(
      new Set([
        ...asStringArray(raw.cart_short_ids),
        ...asStringArray(raw.cart_ids),
      ].map((x) => x.trim()).filter(Boolean))
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
    // Basic sanity: Brazil + DDD + number (at least 12 digits with 55)
    if (whatsapp.length < 12) {
      return NextResponse.json({ error: "WhatsApp inválido." }, { status: 400 });
    }

    const plan = pickPaymentPlan(raw.payment_plan);
    const { expiresAt, pickupDeadlineAt, depositAmount, depositRequired } = computeDeadlines(plan);

    // 1) Load items
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

    // 2) Upsert customer by WhatsApp
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

    // 3) Create order
    const code = makeCode();

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        code,
        customer_id: customerId,
        total,
        status: "reserved",
        expires_at: expiresAt.toISOString(),
        payment_plan: plan,
        deposit_amount: depositAmount,
        support_whatsapp: SUPPORT_WA,
        pix_key: PIX_KEY,
        pix_favored: PIX_FAVORED,
        pix_total_target: total,
        pickup_location: PICKUP_LOCATION,
      })
      // Important: select ONLY columns that exist (avoid schema-cache errors)
      .select("id, code, status, total, payment_plan, deposit_amount, expires_at")
      .single();

    if (orderErr || !order?.id) {
      return NextResponse.json({ error: getErrorMessage(orderErr) }, { status: 500 });
    }

    // 4) Create order_items
    const orderItemsPayload = available.map((it) => ({
      order_id: order.id,
      item_id: it.id,
      item_short_id: it.short_id,
      item_title: it.title,
      price: it.price,
    }));

    const { error: oiErr } = await supabase.from("order_items").insert(orderItemsPayload);
    if (oiErr) {
      return NextResponse.json({ error: getErrorMessage(oiErr) }, { status: 500 });
    }

    // 5) Mark items as reserved
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
      return NextResponse.json({ error: getErrorMessage(updErr) }, { status: 500 });
    }

    const updatedCount = Array.isArray(updatedItems) ? updatedItems.length : 0;
    if (updatedCount !== available.length) {
      // Best effort cleanup: cancel order (keep audit trail)
      await supabase.from("orders").update({ status: "canceled" }).eq("id", order.id);
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
        deposit_required: depositRequired,
        deposit_amount: depositAmount,
        expires_at: (order.expires_at as string | null) ?? null,
        pickup_deadline_at: pickupDeadlineAt ? pickupDeadlineAt.toISOString() : null,
      },
      pix: { key: PIX_KEY, favored: PIX_FAVORED },
      whatsapp_url: whatsappUrlForOrder(order.code as string, total),
    });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
