import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";

const Body = z.object({
  instagram: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const ig = parsed.data.instagram.trim().replace(/^@/, "").toLowerCase();
  if (!ig) return NextResponse.json({ error: "@instagram inválido" }, { status: 400 });

  const s = supabaseService();
  const { data, error } = await s
    .from("customers")
    .select("name,email,whatsapp,opt_in_marketing")
    .eq("instagram", ig)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  return NextResponse.json({ customer: data });
}
