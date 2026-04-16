import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Erro";
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  // ✅ IMPORTANTE: supabaseServer() é async
  const supabase = await supabaseServer();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido (JSON)." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Payload inválido (objeto esperado)." }, { status: 400 });
  }

  const short_id = typeof body.short_id === "string" ? body.short_id.trim() : "";
  if (!short_id) {
    return NextResponse.json({ error: "Payload inválido: short_id é obrigatório." }, { status: 400 });
  }

  try {
    // Busca item
    const { data: item, error: itemErr } = await supabase
      .from("items")
      .select("id, short_id, status")
      .eq("short_id", short_id)
      .maybeSingle();

    if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 });
    if (!item) return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });

    // Só pode excluir rascunho / em revisão
    if (item.status !== "review") {
      return NextResponse.json(
        { error: "Só é possível excluir itens em rascunho (status: review)." },
        { status: 409 }
      );
    }

    const { error: delErr } = await supabase.from("items").delete().eq("id", item.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, short_id: item.short_id });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}