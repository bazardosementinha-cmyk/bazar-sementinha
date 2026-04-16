import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ItemStatus = "review" | "available" | "reserved" | "sold" | "donated" | "archived";

type ItemRow = {
  id: string;
  short_id: string;
  price: number | null;
  sold_price: number | null;
  sold_price_final: number | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseStatus(v: unknown): ItemStatus | null {
  const s = typeof v === "string" ? v : "";
  const allowed: ItemStatus[] = ["review", "available", "reserved", "sold", "donated", "archived"];
  return allowed.includes(s as ItemStatus) ? (s as ItemStatus) : null;
}

function parseMoneyBR(input: unknown): number | null {
  // aceita number, "115,00", "1.299,90", "1299.90"
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input !== "string") return null;

  const raw = input.trim();
  if (!raw) return null;

  const cleaned = raw.replace(/R\$\s?/gi, "").replace(/\s/g, "");
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  // ✅ supabaseServer() é async no seu projeto
  const supabase = await supabaseServer();

  let bodyUnknown: unknown;
  try {
    bodyUnknown = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido (JSON)." }, { status: 400 });
  }

  if (!isRecord(bodyUnknown)) {
    return NextResponse.json({ error: "Payload inválido (objeto esperado)." }, { status: 400 });
  }

  const itemId = typeof bodyUnknown.item_id === "string" ? bodyUnknown.item_id : null;
  const shortId = typeof bodyUnknown.short_id === "string" ? bodyUnknown.short_id : null;
  const status = parseStatus(bodyUnknown.status);

  const soldPriceFinalRaw = bodyUnknown.sold_price_final;
  const soldPriceFinalParsed = soldPriceFinalRaw == null ? null : parseMoneyBR(soldPriceFinalRaw);

  if (!itemId && !shortId) {
    return NextResponse.json({ error: "Payload inválido: informe item_id ou short_id." }, { status: 400 });
  }
  if (!status) {
    return NextResponse.json({ error: "Payload inválido: status inválido." }, { status: 400 });
  }
  if (soldPriceFinalRaw != null && soldPriceFinalParsed == null) {
    return NextResponse.json({ error: "Payload inválido: sold_price_final inválido." }, { status: 400 });
  }

  // 1) Carrega item
  const baseQ = supabase
    .from("items")
    .select("id, short_id, price, sold_price, sold_price_final")
    .limit(1);

  const { data: itemRow, error: selErr } = itemId
    ? await baseQ.eq("id", itemId).maybeSingle()
    : await baseQ.eq("short_id", shortId as string).maybeSingle();

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });
  if (!itemRow) return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });

  const item = itemRow as ItemRow;

  // 2) Monta update
  const updatePayload: Partial<ItemRow> & { status: ItemStatus } = { status };

  // Se virou vendido: salva snapshot do preço anunciado + preço final
  if (status === "sold") {
    const announced = (typeof item.price === "number" && Number.isFinite(item.price)) ? item.price : 0;

    // sold_price = snapshot do anunciado ao vender (se já existe, mantém)
    const soldPrice =
      typeof item.sold_price === "number" && Number.isFinite(item.sold_price) ? item.sold_price : announced;

    // sold_price_final = informado ou fallback para sold_price/announced
    const soldFinal =
      soldPriceFinalParsed != null
        ? soldPriceFinalParsed
        : (typeof item.sold_price_final === "number" && Number.isFinite(item.sold_price_final))
          ? item.sold_price_final
          : soldPrice;

    updatePayload.sold_price = soldPrice;
    updatePayload.sold_price_final = soldFinal;
  }

  const { error: updErr } = await supabase.from("items").update(updatePayload).eq("id", item.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    id: item.id,
    short_id: item.short_id,
    status,
    sold_price: status === "sold" ? updatePayload.sold_price : item.sold_price,
    sold_price_final: status === "sold" ? updatePayload.sold_price_final : item.sold_price_final,
  });
}