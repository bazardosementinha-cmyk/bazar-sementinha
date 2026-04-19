import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabase/service";

type ItemStatus = "review" | "available" | "reserved" | "sold";

type PaymentPlan = "pix_now" | "card_pickup_deposit" | "pay_pickup_24h";

const BodySchema = z
  .object({
    // novo padrão
    cart_short_ids: z.array(z.string()).optional(),
    customer: z
      .object({
        name: z.string().min(2),
        whatsapp: z.string().min(8),
        email: z.string().email().optional().or(z.literal("")),
        opt_in_marketing: z.boolean().optional(),
        // legado (não usamos mais, mas aceitamos sem quebrar)
        instagram: z.string().optional().or(z.literal("")),
      })
      .optional(),

    payment_plan: z.enum(["pix_now", "card_pickup_deposit", "pay_pickup_24h"]).optional(),

    // legado (Checkout antigo)
    cart_ids: z.array(z.string()).optional(),
    customer_name: z.string().optional(),
    customer_whatsapp: z.string().optional(),
    customer_email: z.string().optional(),
    opt_in_marketing: z.boolean().optional(),
    customer_instagram: z.string().optional(),
  })
  .passthrough();

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function randomCode(len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem caracteres confusos
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalizeWhatsapp(raw: string) {
  // mantém só dígitos
  const digits = raw.replace(/\D+/g, "");
  // se já vier com 55..., mantém; senão assume BR
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido.", details: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;

  const cart_short_ids = (body.cart_short_ids ?? body.cart_ids ?? []).filter((x) => typeof x === "string" && x.trim());
  if (!cart_short_ids.length) {
    return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
  }

  const customerObj =
    body.customer ??
    (body.customer_name && body.customer_whatsapp
      ? {
          name: body.customer_name,
          whatsapp: body.customer_whatsapp,
          email: body.customer_email,
          opt_in_marketing: body.opt_in_marketing,
          instagram: body.customer_instagram,
        }
      : null);

  if (!customerObj?.name || !customerObj?.whatsapp) {
    return NextResponse.json({ error: "Nome e WhatsApp são obrigatórios." }, { status: 400 });
  }

  const name = customerObj.name.trim();
  const whatsapp = customerObj.whatsapp.trim();
  const email = customerObj.email ? customerObj.email.trim() : "";
  const optIn = Boolean(customerObj.opt_in_marketing);

  const payment_plan: PaymentPlan = (body.payment_plan as PaymentPlan | undefined) ?? "pix_now";

  const PIX_KEY = process.env.PIX_KEY || "58.392.598/0001-91";
  const PIX_FAVORED = process.env.PIX_FAVORED || "Templo de Umbanda Caboclo Sete Flexa";
  const SUPPORT_WA = process.env.SUPPORT_WA || "5519992360856";

  const now = new Date();
  let expires_at: Date | null = addHours(now, 24);
  let pickup_deadline_at: Date | null = null;
  let deposit_required = false;
  let deposit_amount: number | null = null;

  if (payment_plan === "card_pickup_deposit") {
    deposit_required = true;
    deposit_amount = 10;
    pickup_deadline_at = addDays(now, 15);
    expires_at = pickup_deadline_at;
  }

  // Busca itens (e valida disponibilidade)
  const sb = supabaseService();
  const { data: items, error: itemsErr } = await sb
    .from("items")
    .select("id, short_id, title, price, status")
    .in("short_id", cart_short_ids);

  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  const found = items ?? [];
  const foundIds = new Set(found.map((it) => it.short_id));
  const missing = cart_short_ids.filter((sid) => !foundIds.has(sid));
  if (missing.length) {
    return NextResponse.json({ error: `Itens não encontrados: ${missing.join(", ")}` }, { status: 404 });
  }

  const unavailable = found.filter((it) => it.status !== "available");
  if (unavailable.length) {
    return NextResponse.json(
      {
        error: "Alguns itens não estão disponíveis.",
        items: unavailable.map((it) => ({ short_id: it.short_id, status: it.status })),
      },
      { status: 409 }
    );
  }

  // total anunciado
  const total = found.reduce((sum, it) => sum + (Number(it.price) || 0), 0);

  // Upsert customer (WhatsApp-first)
  const instagramFallback = ""; // não usamos mais, mas mantém compatibilidade caso a coluna ainda seja NOT NULL em algum ambiente
  const { data: existingCustomer, error: custFindErr } = await sb
    .from("customers")
    .select("id")
    .eq("whatsapp", whatsapp)
    .maybeSingle();

  if (custFindErr) {
    return NextResponse.json({ error: custFindErr.message }, { status: 500 });
  }

  let customer_id: string;
  if (existingCustomer?.id) {
    const { error: custUpdErr } = await sb
      .from("customers")
      .update({
        name,
        email: email || null,
        opt_in_marketing: optIn,
      })
      .eq("id", existingCustomer.id);

    if (custUpdErr) {
      return NextResponse.json({ error: custUpdErr.message }, { status: 500 });
    }
    customer_id = existingCustomer.id;
  } else {
    const { data: custIns, error: custInsErr } = await sb
      .from("customers")
      .insert({
        name,
        whatsapp,
        email: email || null,
        opt_in_marketing: optIn,
        instagram: instagramFallback,
      })
      .select("id")
      .single();

    if (custInsErr) {
      return NextResponse.json({ error: custInsErr.message }, { status: 500 });
    }
    customer_id = custIns.id;
  }

  // Reserva itens (primeiro) — melhor UX: evita corrida antes de criar o pedido
  const itemIds = found.map((it) => it.id);
  const { data: reservedRows, error: reserveErr } = await sb
    .from("items")
    .update({ status: "reserved" satisfies ItemStatus })
    .in("id", itemIds)
    .eq("status", "available")
    .select("id");

  if (reserveErr) {
    return NextResponse.json({ error: reserveErr.message }, { status: 500 });
  }

  if ((reservedRows?.length ?? 0) !== itemIds.length) {
    // tenta desfazer o que conseguiu reservar
    const reservedIds = (reservedRows ?? []).map((r) => r.id);
    if (reservedIds.length) {
      await sb.from("items").update({ status: "available" satisfies ItemStatus }).in("id", reservedIds);
    }
    return NextResponse.json({ error: "Alguns itens acabaram de ficar indisponíveis. Tente novamente." }, { status: 409 });
  }

  const code = randomCode(6);

  // Cria pedido
  const { data: order, error: orderErr } = await sb
    .from("orders")
    .insert({
      code,
      customer_id,
      customer_name: name,
      customer_whatsapp: whatsapp,
      customer_email: email || null,
      customer_instagram: null,
      opt_in_marketing: optIn,
      status: "reserved",
      payment_plan,
      pix_key: PIX_KEY,
      pix_favored: PIX_FAVORED,
      deposit_required,
      deposit_amount,
      deposit_paid: false,
      expires_at: expires_at ? expires_at.toISOString() : null,
      pickup_deadline_at: pickup_deadline_at ? pickup_deadline_at.toISOString() : null,
    })
    .select("id, code, status, payment_plan, deposit_required, deposit_amount, expires_at, pickup_deadline_at")
    .single();

  if (orderErr) {
    // desfaz reserva
    await sb.from("items").update({ status: "available" satisfies ItemStatus }).in("id", itemIds);
    return NextResponse.json({ error: orderErr.message }, { status: 500 });
  }

  // order_items
  const orderItems = found.map((it) => ({
    order_id: order.id,
    item_id: it.id,
    item_short_id: it.short_id,
    item_title: it.title,
    price: it.price,
  }));

  const { error: oiErr } = await sb.from("order_items").insert(orderItems);
  if (oiErr) {
    // desfaz tudo
    await sb.from("items").update({ status: "available" satisfies ItemStatus }).in("id", itemIds);
    await sb.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: oiErr.message }, { status: 500 });
  }

  // WhatsApp message (curto e direto)
  const totalStr = formatBRL(total);
  const planText =
    payment_plan === "pix_now"
      ? "Pix agora (valor total)"
      : payment_plan === "card_pickup_deposit"
        ? "Cartão na retirada (caução Pix R$ 10,00)"
        : "Pagar na retirada (Pix ou cartão)";

  const msgLines: string[] = [
    `Olá! Fiz um pedido no Bazar do Sementinha.`,
    `Pedido: ${order.code}`,
    `Total: R$ ${totalStr}`,
    `Pagamento: ${planText}`,
    "",
  ];

  if (payment_plan === "pix_now") {
    msgLines.push(`Vou pagar via Pix agora. Chave: ${PIX_KEY} (${PIX_FAVORED}).`);
    msgLines.push("Envio o comprovante em seguida.");
  } else if (payment_plan === "card_pickup_deposit") {
    msgLines.push(`Vou pagar na retirada com cartão. Vou fazer o Pix de caução de R$ 10,00 agora.`);
    msgLines.push(`Chave: ${PIX_KEY} (${PIX_FAVORED}).`);
    msgLines.push("Envio o comprovante do Pix de caução em seguida.");
  } else {
    msgLines.push("Vou pagar na retirada. Se não pagar em 24h, pode cancelar automaticamente.");
  }

  const whatsappDigits = normalizeWhatsapp(SUPPORT_WA);
  const whatsapp_url = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(msgLines.join("\n"))}`;

  return NextResponse.json({
    ok: true,
    order: {
      id: order.id,
      code: order.code,
      status: order.status,
      total,
      payment_plan: order.payment_plan,
      deposit_required: order.deposit_required,
      deposit_amount: order.deposit_amount,
      expires_at: order.expires_at,
      pickup_deadline_at: order.pickup_deadline_at,
    },
    pix: { key: PIX_KEY, favored: PIX_FAVORED },
    whatsapp_url,
  });
}
