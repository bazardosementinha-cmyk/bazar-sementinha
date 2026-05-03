import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { deriveOperationalFields } from "@/lib/item-taxonomy";

export const runtime = "nodejs";

type UpdatePayload = {
  short_id: string;
  title?: string;
  description?: string;
  category?: string;
  condition?: string;
  price?: string | number | null;
  price_from?: string | number | null;
  gender?: string;
  age_group?: string;
  season?: string;
  size_type?: string;
  size_value?: string;
  location_box?: string;
  notes_internal?: string;
  subcategory?: string | null;
  item_type?: string | null;
  brand?: string | null;
  color?: string | null;
  material?: string | null;
  measurements?: string | null;
  condition_notes?: string | null;
  is_fragile?: boolean | null;
  requires_measurement?: boolean | null;
  label_template?: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function clamp(s: string, max: number) {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "...";
}

function parseBoolean(input: unknown): boolean | null {
  if (typeof input === "boolean") return input;
  if (typeof input === "string") {
    const value = input.trim().toLowerCase();
    if (["true", "1", "sim", "yes"].includes(value)) return true;
    if (["false", "0", "nao", "não", "no"].includes(value)) return false;
  }
  return null;
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

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido (JSON)." }, { status: 400 });
  }

  if (!isRecord(body)) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  const p = body as UpdatePayload;
  const short_id = (p.short_id || "").trim();
  if (!short_id) return NextResponse.json({ error: "short_id é obrigatório" }, { status: 400 });

  const supabase = await supabaseServer();

  const { data: item, error: selErr } = await supabase
    .from("items")
    .select("id,status")
    .eq("short_id", short_id)
    .maybeSingle();

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });
  if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  if (item.status !== "review") {
    return NextResponse.json({ error: "Só é possível editar itens em rascunho (review)." }, { status: 409 });
  }

  const update: Record<string, unknown> = {};

  if (typeof p.title === "string") update.title = clamp(p.title, 80);
  if (typeof p.description === "string") update.description = clamp(p.description, 320);
  if (typeof p.category === "string") update.category = clamp(p.category, 40);
  if (typeof p.condition === "string") update.condition = p.condition;

  const price = p.price == null ? null : parseMoneyBR(p.price);
  const price_from = p.price_from == null ? null : parseMoneyBR(p.price_from);

  if (p.price != null && price == null) return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
  if (p.price_from != null && price_from == null) return NextResponse.json({ error: "Preço (de) inválido" }, { status: 400 });

  if (p.price != null) update.price = price;
  if (p.price_from != null) update.price_from = price_from;

  if (typeof p.gender === "string") update.gender = p.gender;
  if (typeof p.age_group === "string") update.age_group = p.age_group;
  if (typeof p.season === "string") update.season = p.season;
  if (typeof p.size_type === "string") update.size_type = p.size_type;
  if (typeof p.size_value === "string") update.size_value = clamp(p.size_value, 40);

  if (typeof p.location_box === "string") update.location_box = clamp(p.location_box, 40);
  if (typeof p.notes_internal === "string") update.notes_internal = clamp(p.notes_internal, 300);

  const derived = deriveOperationalFields({
    category: typeof p.category === "string" ? p.category : undefined,
    title: typeof p.title === "string" ? p.title : undefined,
    sizeType: typeof p.size_type === "string" ? p.size_type : undefined,
    notesInternal: typeof p.notes_internal === "string" ? p.notes_internal : undefined,
  });

  update.subcategory = typeof p.subcategory === "string" ? clamp(p.subcategory, 80) : derived.subcategory;
  update.item_type = typeof p.item_type === "string" ? clamp(p.item_type, 80) : derived.item_type;
  if (typeof p.brand === "string") update.brand = clamp(p.brand, 80);
  if (typeof p.color === "string") update.color = clamp(p.color, 80);
  if (typeof p.material === "string") update.material = clamp(p.material, 80);
  if (typeof p.measurements === "string") update.measurements = clamp(p.measurements, 120);
  if (typeof p.condition_notes === "string") update.condition_notes = clamp(p.condition_notes, 300);

  const isFragile = parseBoolean(p.is_fragile);
  const requiresMeasurement = parseBoolean(p.requires_measurement);
  update.is_fragile = isFragile ?? derived.is_fragile;
  update.requires_measurement = requiresMeasurement ?? derived.requires_measurement;
  update.label_template = typeof p.label_template === "string" && p.label_template.trim()
    ? clamp(p.label_template, 24)
    : derived.label_template;

  const { error: updErr } = await supabase.from("items").update(update).eq("id", item.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
