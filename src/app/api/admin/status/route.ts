import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

const Body = z.object({
  item_id: z.string().min(1),
  status: z.enum(["review", "available", "reserved", "sold", "donated", "archived"]),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const supabase = await supabaseServer();
  const { error } = await supabase.from("items").update({ status: parsed.data.status }).eq("id", parsed.data.item_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
