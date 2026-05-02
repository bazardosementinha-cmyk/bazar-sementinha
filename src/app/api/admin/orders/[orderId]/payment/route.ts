import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const { orderId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };

  if (body.action && body.action !== "confirm") {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  const s = supabaseService();
  const now = new Date().toISOString();

  const { error } = await s
    .from("orders")
    .update({ status: "paid", payment_status: "confirmed", paid_at: now })
    .eq("id", orderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
