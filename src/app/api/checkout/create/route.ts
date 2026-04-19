import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";

type ItemStatus = "review" | "available" | "reserved" | "sold";

type ItemRow = {
  id: string;
  short_id: string;
  title: string | null;
  price: number | null;
  status: ItemStatus | string | null;
};

type CustomerInput = {
  name: string;
  whatsapp: string;
  email: string | null;
  opt_in_marketing: boolean;
};

type ParsedBody = {
  cart_short_ids: string[];
  customer: CustomerInput;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

function asBool(v: unknown): boolean {
  return v === true;
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => x.length > 0);
}

function normalizeEmail(v: unknown): string | null {
  const s = asString(v);
  if (!s) return null;
  // validação leve (sem “inventar” e-mail)
  if (!s.includes("@")) return null;
  return s.toLowerCase();
}

function normalizeWhatsapp(v: unknown): string | null {
  const s = asString(v);
  if (!s) return null;

  // mantém só dígitos
  const digits = s.replace(/\D/g, "");

  // Esperado BR: DDD + número (10 ou 11 dígitos) — mas aceitamos 12/13 se vier com 55
  // Exemplos: 19992360856, 5519992360856
  if (digits.length < 10) return null;

  // padroniza sem "+" (armazenar como dígitos é simples)
  return digits;
}

function nowPlusHours(h: number) {
  return new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
}

function parseBody(body: unknown): ParsedBody | null {
  if (!isRecord(body)) return null;

  const cart_short_ids = toStringArray(body["cart_short_ids"]);
  const custRaw = body["customer"];
  if (!isRecord(custRaw)) return null;

  const name = asString(custRaw["name"]) ?? "";
  const whatsapp = asString(custRaw["whatsapp"]) ?? "";
  const email = normalizeEmail(custRaw["email"]);
  const opt_in_marketing = asBool(custRaw["opt_in_marketing"]);

  return {
    cart_short_ids,
    customer: { name, whatsapp, email, opt_in_marketing },
  };
}

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const body = parseBody(raw);

  if (!body) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  const shortIds = body.cart_short_ids;
  const customer = body.customer;

  if (!shortIds.length) return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
  if (!customer.name.trim()) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });

  const wa = normalizeWhatsapp(customer.whatsapp);
  if (!wa) return NextResponse.json({ error: "WhatsApp é obrigatório (com DDD)." }, { status: 400 });

  const pixKey = process.env.PIX_KEY || "";
  if (!pixKey) return NextResponse.json({ error: "PIX_KEY não configurado no servidor." }, { status: 500 });

  const pickup = process.env.PICKUP_LOCATION || "TUCXA2";

  const s = supabaseService();

  // 1) Carrega itens e valida disponibilidade
  const { data: items, error: itErr } = await s
    .from("items")
    .select("id,short_id,title,price,status")
    .in("short_id", shortIds);

  if (itErr) return NextResponse.json({ error: itErr.message }, { status: 500 });

  const found = (items ?? []) as ItemRow[];

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

  // 2) upsert customer por WhatsApp
  const { data: existingCust, error: exErr } = await s
    .from("customers")
    .select("id,email,whatsapp,opt_in_marketing")
    .eq("whatsapp", wa)
    .maybeSingle();

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

  let customerId: string | null = (existingCust as { id?: string } | null)?.id ?? null;

  if (!customerId) {
    const { data: createdCust, error: cErr } = await s
      .from("customers")
      .insert({
        name: customer.name.trim(),
        email: customer.email,
        whatsapp: wa,
        opt_in_marketing: !!customer.opt_in_marketing,
        // instagram fica totalmente opcional no banco; não setamos aqui
      })
      .select("id")
      .single();

    if (cErr || !createdCust) {
      return NextResponse.json({ error: cErr?.message || "Falha ao criar cliente." }, { status: 500 });
    }

    customerId = (createdCust as { id: string }).id;
  } else {
    // Atualiza apenas o que veio (não apaga dados antigos com null)
    const patch: Record<string, unknown> = {
      name: customer.name.trim(),
      opt_in_marketing: !!customer.opt_in_marketing,
    };
    if (customer.email) patch.email = customer.email;

    const { error: uErr } = await s.from("customers").update(patch).eq("id", customerId);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  }

  // 3) create order (reserved 24h)
  const expires_at = nowPlusHours(24);

  const { data: order, error: oErr } = await s
    .from("orders")
    .insert({
      code,
      customer_id: customerId,
      customer_name: customer.name.trim(),
      customer_email: customer.email,
      customer_whatsapp: wa,
      status: "reserved",
      total,
      pix_key: pixKey,
      pickup_location: pickup,
      expires_at,
    })
    .select("id,code,expires_at,total")
    .single();

  if (oErr || !order) return NextResponse.json({ error: oErr?.message || "Falha ao criar pedido." }, { status: 500 });

  // 4) insert order_items snapshot
  const rows = found.map((x) => ({
    order_id: (order as { id: string }).id,
    item_id: x.id,
    item_short_id: x.short_id,
    item_title: x.title,
    price: x.price,
  }));

  const { error: oiErr } = await s.from("order_items").insert(rows);
  if (oiErr) return NextResponse.json({ error: oiErr.message }, { status: 500 });

  // 5) reserve items
  const { error: upErr } = await s.from("items").update({ status: "reserved" }).in(
    "id",
    found.map((x) => x.id)
  );
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // 6) reminders (8h e 16h)
  const { error: rErr } = await s.from("order_reminders").insert([
    { order_id: (order as { id: string }).id, kind: "remind_8h", due_at: nowPlusHours(8) },
    { order_id: (order as { id: string }).id, kind: "remind_16h", due_at: nowPlusHours(16) },
  ]);
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  return NextResponse.json({
    order_id: (order as { id: string }).id,
    code: (order as { code: string }).code,
    expires_at: (order as { expires_at: string }).expires_at,
    total: (order as { total: number }).total,
  });
}