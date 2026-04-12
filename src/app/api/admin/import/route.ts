import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { extractPricesFromCaption } from "@/lib/price";

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

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const supabase = await supabaseServer();

  const form = await req.formData();

  const caption = String(form.get("caption") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const category = String(form.get("category") ?? "Outros");
  const condition = String(form.get("condition") ?? "Bom");
  const size = String(form.get("size") ?? "").trim() || null;
  const sourceUrl = String(form.get("source_url") ?? "").trim() || null;

  const photos = form.getAll("photos").filter((p): p is File => p instanceof File);

  if (!title) return NextResponse.json({ error: "Título é obrigatório." }, { status: 400 });
  if (photos.length < 1) return NextResponse.json({ error: "Envie pelo menos 1 foto." }, { status: 400 });

  const prices = extractPricesFromCaption(caption);
  if (!prices.price) {
    return NextResponse.json(
      { error: "Preço não detectado. Inclua na legenda (ex.: 'por R$ 115,00' ou 'de R$ 229,00 por R$ 115,00')." },
      { status: 400 }
    );
  }

  const short_id = nanoid(6).toUpperCase();

  // Cria item (status review/rascunho)
  const { data: item, error: insErr } = await supabase
    .from("items")
    .insert({
      short_id,
      title,
      description: caption || null,
      category,
      condition,
      size,
      price: prices.price,
      price_from: prices.price_from ?? null,
      status: "review",
      source: sourceUrl ? "instagram" : "manual",
      source_url: sourceUrl,
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
    if (up.error) {
      return NextResponse.json({ error: `Falha ao subir foto ${i + 1}: ${up.error.message}` }, { status: 500 });
    }

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