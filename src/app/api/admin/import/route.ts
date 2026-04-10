import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { extractPricesFromCaption } from "@/lib/price";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const form = await req.formData();

  const title = String(form.get("title") || "Item do Bazar").slice(0, 120);
  const caption = String(form.get("caption") || "");
  const category = String(form.get("category") || "Outros");
  const condition = String(form.get("condition") || "Bom");
  const size = String(form.get("size") || "") || null;
  const location_box = String(form.get("location_box") || "") || null;
  const note = String(form.get("note") || "") || null;
  const source_url = String(form.get("source_url") || "") || null;

  const prices = extractPricesFromCaption(caption);
  const price = typeof prices.price === "number" ? prices.price : 0;
  const price_from = typeof prices.price_from === "number" ? prices.price_from : null;

  const photos = form.getAll("photos").filter((v) => v instanceof File) as File[];
  if (!photos.length) {
    return NextResponse.json({ error: "Envie ao menos 1 foto." }, { status: 400 });
  }

  const short_id = nanoid(6);
  const supabase = supabaseServer();

  // Create item
  const { data: item, error: insErr } = await supabase
    .from("items")
    .insert({
      short_id,
      title,
      description: caption || note,
      category,
      condition,
      size,
      price,
      price_from,
      status: "review",
      source: source_url ? "instagram" : "manual",
      source_url,
      location_box,
      notes_internal: note,
      created_by: gate.user.id,
    })
    .select("id, short_id, status")
    .single();

  if (insErr || !item) {
    return NextResponse.json({ error: insErr?.message || "Falha ao criar item" }, { status: 500 });
  }

  // Upload photos to storage and register paths
  const bucket = supabase.storage.from("items");

  let position = 1;
  for (const f of photos.slice(0, 6)) {
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
    const path = `items/${short_id}/${String(position).padStart(2, "0")}.${ext}`;

    const arrayBuffer = await f.arrayBuffer();
    const { error: upErr } = await bucket.upload(path, arrayBuffer, {
      contentType: f.type || "image/jpeg",
      upsert: true,
    });

    if (upErr) {
      return NextResponse.json({ error: `Falha upload foto ${position}: ${upErr.message}` }, { status: 500 });
    }

    const { error: pErr } = await supabase.from("item_photos").insert({
      item_id: item.id,
      storage_path: path,
      position,
    });

    if (pErr) {
      return NextResponse.json({ error: `Falha salvar foto ${position}: ${pErr.message}` }, { status: 500 });
    }

    position += 1;
  }

  return NextResponse.json({ id: item.id, short_id: item.short_id, status: item.status });
}
