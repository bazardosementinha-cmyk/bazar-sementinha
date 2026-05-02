import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { DEMO_CATALOG_ITEMS } from "@/lib/demo-catalog";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function demoAttributes(item: (typeof DEMO_CATALOG_ITEMS)[number]) {
  return {
    demo: true,
    demo_group: item.demo_group,
    demo_photo_count: 3,
    demo_photo_paths: [1, 2, 3].map((position) => `demo-catalog/${item.short_id}-${String(position).padStart(2, "0")}.png`),
    demo_photo_notes: ["Foto principal", "Detalhe/medida", "Etiqueta/condição"],
  };
}

async function upsertDemoCatalog() {
  const supabase = supabaseService();
  const rows = DEMO_CATALOG_ITEMS.map((item) => ({
    short_id: item.short_id,
    title: item.title,
    description: item.description,
    category: item.category,
    condition: item.condition,
    size: item.size_type && item.size_value ? `${item.size_type}:${item.size_value}` : null,
    price: item.price,
    price_from: item.price_from,
    status: "review",
    source: "demo_catalog",
    source_url: null,
    location_box: item.location_box,
    notes_internal: item.notes_internal,
    gender: item.gender,
    age_group: item.age_group,
    season: item.season,
    size_type: item.size_type,
    size_value: item.size_value,
    subcategory: item.subcategory,
    item_type: item.item_type,
    brand: item.brand,
    color: item.color,
    material: item.material,
    measurements: item.measurements,
    condition_notes: item.condition_notes,
    is_fragile: item.is_fragile,
    requires_measurement: item.requires_measurement,
    label_template: item.label_template,
    review_status: "demo",
    is_demo: true,
    demo_group: item.demo_group,
    demo_sort: item.demo_sort,
    visibility: "admin_demo",
    attributes_json: demoAttributes(item),
  }));

  const { error } = await supabase.from("items").upsert(rows, { onConflict: "short_id" });
  if (error) throw error;
  return rows.length;
}

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  return NextResponse.json({ items: DEMO_CATALOG_ITEMS });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  try {
    const count = await upsertDemoCatalog();
    return NextResponse.redirect(new URL(`/admin/catalogo-demo?seeded=${count}`, req.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao criar catálogo demo";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
