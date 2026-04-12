import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";

type Body = {
  cart_short_ids: string[];
  customer: {
    name: string;
    instagram: string;
    email: string | null;
    whatsapp: string | null;
    opt_in_marketing: boolean;
  };
};

function nowPlusHours(h: number) {
  return new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;

  const shortIds = Array.isArray(body.cart_short_ids) ? body.cart_short_ids : [];
  const customer = body.customer;

  if (!shortIds.length) return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
  if (!customer?.name?.trim()) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  if (!customer?.instagram?.trim()) return NextResponse.json({ error: "@instagram é obrigatório." }, { status: 400 });

  const pixKey = process.env.PIX_KEY || "";
  if (!pixKey) return NextResponse.json({ error: "PIX_KEY não configurado no servidor." }, { status: 500 });

  const pickup = process.env.PICKUP_LOCATION || "TUCXA2";

  const s = supabaseService();

  // Carrega itens e valida disponibilidade
  const { data: items, error: itErr } = await s
    .from("items")
    .select("id,short_id,title,price,status")
    .in("short_id", shortIds);

  if (itErr) return NextResponse.json({ error: itErr.message }, { status: 500 });

  const found = items ?? [];
  const missing = shortIds.filter((sid) => !found.some((x) => x.short_id === sid));
  if (missing.length) return NextResponse.json({ error: `Itens não encontrados: ${missing.join(", ")}` }, { status: 400 });

  const notAvail = found.filter((x) => x.status !== "available");
  if (notAvail.length) {
    return NextResponse.json(
      { error: `Alguns itens não estão disponíveis: ${notAvail.map((x) => `#${x.short_id} (${x.status})`).join(", ")}` },
      { status: 400 }
    );
  }

  const total = found.reduce((sum, x) => sum + Number(x.price ?? 0), 0);
  const code = `ORD-${nanoid(6).toUpperCase()}`;

  // 1) upsert customer (simples: sempre cria um novo ou tenta casar por instagram)
  const ig = customer.instagram.replace(/^@/, "").trim();

  const { data: existingCust } = await s.from("customers").select("id").eq("instagram", ig).maybeSingle();

  let customerId: string | null = existingCust?.id ?? null;

  if (!customerId) {
    const { data: createdCust, error: cErr } = await s
      .from("customers")
      .insert({
        name: customer.name.trim(),
        email: customer.email,
        whatsapp: customer.whatsapp,
        instagram: ig,
        opt_in_marketing: !!customer.opt_in_marketing,
      })
      .select("id")
      .single();
    if (cErr || !createdCust) return NextResponse.json({ error: cErr?.message || "Falha ao criar cliente." }, { status: 500 });
    customerId = createdCust.id;
  }

  // 2) create order (reserved 24h)
  const expires_at = nowPlusHours(24);

  const { data: order, error: oErr } = await s
    .from("orders")
    .insert({
      code,
      customer_id: customerId,
      customer_name: customer.name.trim(),
      customer_email: customer.email,
      customer_whatsapp: customer.whatsapp,
      customer_instagram: ig,
      status: "reserved",
      total,
      pix_key: pixKey,
      pickup_location: pickup,
      expires_at,
    })
    .select("id,code,expires_at,total")
    .single();

  if (oErr || !order) return NextResponse.json({ error: oErr?.message || "Falha ao criar pedido." }, { status: 500 });

  // 3) insert order_items snapshot
  const rows = found.map((x) => ({
    order_id: order.id,
    item_id: x.id,
    item_short_id: x.short_id,
    item_title: x.title,
    price: x.price,
  }));
  const { error: oiErr } = await s.from("order_items").insert(rows);
  if (oiErr) return NextResponse.json({ error: oiErr.message }, { status: 500 });

  // 4) reserve items
  const { error: upErr } = await s.from("items").update({ status: "reserved" }).in("id", found.map((x) => x.id));
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // 5) reminders (8h e 16h)
  const { error: rErr } = await s.from("order_reminders").insert([
    { order_id: order.id, kind: "remind_8h", due_at: nowPlusHours(8) },
    { order_id: order.id, kind: "remind_16h", due_at: nowPlusHours(16) },
  ]);
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  return NextResponse.json({ order_id: order.id, code: order.code, expires_at: order.expires_at, total: order.total });
}