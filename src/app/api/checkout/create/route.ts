import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

// Checkout WhatsApp-first:
// - WhatsApp é obrigatório (chave do customer)
// - Instagram é opcional (não exige)
// - Reserva itens por 24h e cria lembretes (assistido)

type CustomerPayload = {
  name: string;
  whatsapp: string;
  email?: string | null;
  instagram?: string | null;
  opt_in_marketing?: boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out = v.filter((x) => typeof x === "string") as string[];
  return out.length === v.length ? out : null;
}

function normalizeInstagram(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/^@/, "");
  return s ? s : null;
}

function normalizeWhatsapp(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");

  // BR: 10 ou 11 dígitos (DDD + número) => prefixa 55
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;

  // Já com DDI 55
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;

  return digits.length >= 10 ? digits : null;
}

function nowPlusHours(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function buildWhatsAppLink(whatsappE164: string, message: string): string {
  const msg = encodeURIComponent(message);
  return `https://wa.me/${whatsappE164}?text=${msg}`;
}

export async function POST(req: Request) {
  const s = supabaseService();

  let bodyUnknown: unknown;
  try {
    bodyUnknown = (await req.json()) as unknown;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!isRecord(bodyUnknown)) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const cart_short_ids = asStringArray(bodyUnknown.cart_short_ids);
  const custRaw = isRecord(bodyUnknown.customer) ? (bodyUnknown.customer as Partial<CustomerPayload>) : null;

  if (!cart_short_ids || !cart_short_ids.length) {
    return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
  }
  if (!custRaw) {
    return NextResponse.json({ error: "Cliente obrigatório." }, { status: 400 });
  }

  const name = (asString(custRaw.name) ?? "").trim();
  const whatsapp = normalizeWhatsapp(asString(custRaw.whatsapp));
  const email = (asString(custRaw.email) ?? "").trim() || null;
  const instagram = normalizeInstagram(asString(custRaw.instagram));
  const optIn = !!custRaw.opt_in_marketing;

  if (!name) return NextResponse.json({ error: "Informe seu nome." }, { status: 400 });
  if (!whatsapp) return NextResponse.json({ error: "Informe seu WhatsApp (com DDD)." }, { status: 400 });

  // 0) valida itens e calcula total (somente AVAILABLE)
  const { data: found, error: fErr } = await s
    .from("items")
    .select("id,short_id,title,price,status")
    .in("short_id", cart_short_ids)
    .in("status", ["available"]);

  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
  if (!found || !found.length) {
    return NextResponse.json({ error: "Nenhum item disponível encontrado no carrinho." }, { status: 400 });
  }

  const total = found.reduce((acc, it) => acc + Number(it.price ?? 0), 0);

  // 1) upsert customer por WHATSAPP (chave)
  let customerId: string | null = null;

  const { data: existingCust, error: cFindErr } = await s
    .from("customers")
    .select("id")
    .eq("whatsapp", whatsapp)
    .maybeSingle();

  if (cFindErr && cFindErr.code !== "PGRST116") {
    return NextResponse.json({ error: cFindErr.message }, { status: 500 });
  }

  if (existingCust?.id) {
    customerId = existingCust.id;

    const { error: cUpErr } = await s
      .from("customers")
      .update({
        name,
        email,
        instagram, // opcional
        opt_in_marketing: optIn,
      })
      .eq("id", customerId);

    if (cUpErr) return NextResponse.json({ error: cUpErr.message }, { status: 500 });
  } else {
    const { data: createdCust, error: cInsErr } = await s
      .from("customers")
      .insert({
        name,
        email,
        whatsapp,
        instagram, // opcional
        opt_in_marketing: optIn,
      })
      .select("id")
      .single();

    if (cInsErr || !createdCust) {
      return NextResponse.json({ error: cInsErr?.message || "Falha ao criar cliente." }, { status: 500 });
    }
    customerId = createdCust.id;
  }

  // 2) cria order (reserved 24h)
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const pixKey = process.env.NEXT_PUBLIC_PIX_KEY || "";
  const pickup = process.env.NEXT_PUBLIC_PICKUP_LOCATION || "TUCXA2";
  const expires_at = nowPlusHours(24);

  const { data: order, error: oErr } = await s
    .from("orders")
    .insert({
      code,
      customer_id: customerId,
      customer_name: name,
      customer_email: email,
      customer_whatsapp: whatsapp,
      customer_instagram: instagram, // opcional
      status: "reserved",
      total,
      pix_key: pixKey,
      pickup_location: pickup,
      expires_at,
    })
    .select("id,code,expires_at,total")
    .single();

  if (oErr || !order) {
    return NextResponse.json({ error: oErr?.message || "Falha ao criar pedido." }, { status: 500 });
  }

  // 3) snapshot order_items
  const rows = found.map((x) => ({
    order_id: order.id,
    item_id: x.id,
    item_short_id: x.short_id,
    item_title: x.title,
    price: x.price,
  }));

  const { error: oiErr } = await s.from("order_items").insert(rows);
  if (oiErr) return NextResponse.json({ error: oiErr.message }, { status: 500 });

  // 4) reserva itens
  const { error: upErr } = await s.from("items").update({ status: "reserved" }).in("id", found.map((x) => x.id));
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // 5) cria lembretes (assistido)
  const { error: rErr } = await s.from("order_reminders").insert([
    { order_id: order.id, kind: "remind_8h", due_at: nowPlusHours(8) },
    { order_id: order.id, kind: "remind_16h", due_at: nowPlusHours(16) },
  ]);
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  // 6) retorno WhatsApp-first
  const message =
    `Olá! Fiz um pedido no Bazar do Sementinha.\n` +
    `Código: ${order.code}\n` +
    `Total: R$ ${Number(order.total).toFixed(2).replace(".", ",")}\n` +
    `Por favor, me envie as instruções de pagamento/retirada.`;

  const whatsapp_url = buildWhatsAppLink(whatsapp, message);

  return NextResponse.json({
    order_id: order.id,
    code: order.code,
    expires_at: order.expires_at,
    total: order.total,
    whatsapp,
    whatsapp_url,
  });
}