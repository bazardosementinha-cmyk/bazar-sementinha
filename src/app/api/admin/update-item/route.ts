import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ItemStatus = "review" | "available" | "reserved" | "sold" | "donated" | "archived";

type Body = {
  short_id: string;
  title?: string;
  description?: string;
  category?: string;
  condition?: string;
  price?: string | number;
  price_from?: string | number | null;
  gender?: string | null;
  age_group?: string | null;
  season?: string | null;
  size_type?: string | null;
  size_value?: string | null;
  location_box?: string | null;
  notes_internal?: string | null;
};

type ItemRow = { id: string; short_id: string; status: ItemStatus | null };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseMoneyBR(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;

  const cleaned = raw.replace(/R\$\s?/gi, "").replace(/\s/g, "");
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

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

  const body = bodyUnknown as Partial<Body>;
  const short_id = typeof body.short_id === "string" ? body.short_id.trim() : "";
  if (!short_id) return NextResponse.json({ error: "short_id é obrigatório." }, { status: 400 });

  const { data: item, error: selErr } = await supabase
    .from("items")
    .select("id, short_id, status")
    .eq("short_id", short_id)
    .maybeSingle();

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });
  if (!item) return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });

  const row = item as ItemRow;

  // ✅ Regra: editar somente rascunho (review)
  if (row.status !== "review") {
    return NextResponse.json(
      { error: "Só é possível editar itens em rascunho (status: review)." },
      { status: 409 }
    );
  }

  const update: Record<string, unknown> = {};

  const title = trimOrNull(body.title);
  if (title) update.title = title;

  const description = trimOrNull(body.description);
  if (description) update.description = description;

  const category = trimOrNull(body.category);
  if (category) update.category = category;

  const condition = trimOrNull(body.condition);
  if (condition) update.condition = condition;

  const price = body.price != null ? parseMoneyBR(body.price) : null;
  if (body.price != null) {
    if (price == null) return NextResponse.json({ error: "price inválido." }, { status: 400 });
    update.price = price;
  }

  if (body.price_from === null) {
    update.price_from = null;
  } else if (body.price_from != null) {
    const pf = parseMoneyBR(body.price_from);
    if (pf == null) return NextResponse.json({ error: "price_from inválido." }, { status: 400 });
    update.price_from = pf;
  }

  const gender = trimOrNull(body.gender);
  if (body.gender === null) update.gender = null;
  else if (gender) update.gender = gender;

  const age_group = trimOrNull(body.age_group);
  if (body.age_group === null) update.age_group = null;
  else if (age_group) update.age_group = age_group;

  const season = trimOrNull(body.season);
  if (body.season === null) update.season = null;
  else if (season) update.season = season;

  const size_type = trimOrNull(body.size_type);
  if (body.size_type === null) update.size_type = null;
  else if (size_type) update.size_type = size_type;

  const size_value = trimOrNull(body.size_value);
  if (body.size_value === null) update.size_value = null;
  else if (size_value) update.size_value = size_value;

  const location_box = trimOrNull(body.location_box);
  if (body.location_box === null) update.location_box = null;
  else if (location_box) update.location_box = location_box;

  const notes_internal = trimOrNull(body.notes_internal);
  if (body.notes_internal === null) update.notes_internal = null;
  else if (notes_internal) update.notes_internal = notes_internal;

  if (!Object.keys(update).length) {
    return NextResponse.json({ ok: true, short_id: row.short_id, updated: false });
  }

  const { error: updErr } = await supabase.from("items").update(update).eq("id", row.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, short_id: row.short_id, updated: true });
}
