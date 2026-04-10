import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

export async function POST() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const supabase = supabaseServer();

  const demo = [
    { title: "Camiseta (azul) - demo", category: "Roupas", condition: "Muito bom", price: 25, status: "available" },
    { title: "Tênis casual - demo", category: "Calçados", condition: "Bom", price: 45, status: "reserved" },
    { title: "Bolsa feminina - demo", category: "Acessórios", condition: "Muito bom", price: 60, status: "available" },
    { title: "Livro - demo", category: "Outros", condition: "Bom", price: 15, status: "sold" },
    { title: "Brinquedo - demo", category: "Outros", condition: "Muito bom", price: 30, status: "review" },
  ];

  for (const d of demo) {
    await supabase.from("items").insert({
      short_id: nanoid(6),
      title: d.title,
      description: "Item de demonstração (gerado automaticamente).",
      category: d.category,
      condition: d.condition,
      size: null,
      price: d.price,
      price_from: null,
      status: d.status,
      source: "demo",
      source_url: null,
      created_by: gate.user.id,
    });
  }

  return NextResponse.redirect(new URL("/admin/itens", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}
