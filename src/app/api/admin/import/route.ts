import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

type ImportResponse = {
  short_id: string;
  status: string;
};

function fileExt(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  const fromType = file.type.split("/").pop()?.toLowerCase();
  return fromType || "jpg";
}

function parseMoneyBR(raw: string): number | null {
  const cleaned = raw.trim().replace(/\./g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const supabase = await supabaseServer();

  const form = await req.formData();

  const title = String(form.get("title") ?? "").trim() || "Item do Bazar";
  const description = String(form.get("description") ?? "").trim() || null;

  const category = String(form.get("category") ?? "Outros");
  const condition = String(form.get("condition") ?? "Bom");

  // Facetas (opcionais)
  const gender = String(form.get("gender") ?? "").trim() || null;
  const age_group = String(form.get("age_group") ?? "").trim() || null;
  const season = String(form.get("season") ?? "").trim() || null;

  const size_type = String(form.get("size_type") ?? "").trim() || null;
  const size_value = String(form.get("size_value") ?? "").trim() || null;

  const price = parseMoneyBR(String(form.get("price") ?? ""));
  const price_from = parseMoneyBR(String(form.get("price_from") ?? ""));

  const location_box = String(form.get("location_box") ?? "").trim() || null;
  const notes_internal = String(form.get("notes_internal") ?? "").trim() || null;

  const photos = form.getAll("photos").filter((p): p is File => p instanceof File);

  if (photos.length < 1) return NextResponse.json({ error: "Envie pelo menos 1 foto." }, { status: 400 });
  if (price == null || price <= 0) return NextResponse.json({ error: "Informe o preço (por)." }, { status: 400 });

  const short_id = nanoid(6).toUpperCase();

  // Para compatibilidade: preencher coluna size (texto) também
  const sizeText = size_type && size_value ? `${size_type}:${size_value}` : null;

  // Cria item (status review/rascunho)
  const { data: item, error: insErr } = await supabase
    .from("items")
    .insert({
      short_id,
      title,
      description,
      category,
      condition,
      size: sizeText,
      price,
      price_from: price_from ?? null,
      status: "review",
      source: "manual",
      source_url: null,
      location_box,
      notes_internal,
      gender,
      age_group,
      season,
      size_type,
      size_value,
    })
    .select("id, short_id, status")
    .single();

  if (insErr || !item) return NextResponse.json({ error: insErr?.message || "Falha ao criar item." }, { status: 500 });

  // Upload fotos + item_photos
  for (let i = 0; i < photos.length; i++) {
    const file = photos[i];
    const ext = fileExt(file);
    const path = `${item.id}/${String(i + 1).padStart(2, "0")}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());

    const up = await supabase.storage.from("items").upload(path, buf, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (up.error) return NextResponse.json({ error: `Falha ao subir foto ${i + 1}: ${up.error.message}` }, { status: 500 });

    const { error: phErr } = await supabase.from("item_photos").insert({
      item_id: item.id,
      storage_path: path,
      position: i + 1,
    });

    if (phErr) return NextResponse.json({ error: `Falha ao salvar foto ${i + 1}: ${phErr.message}` }, { status: 500 });
  }

  const out: ImportResponse = { short_id: item.short_id, status: item.status };
  return NextResponse.json(out);
}
