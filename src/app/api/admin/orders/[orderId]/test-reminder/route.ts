import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendAdminTestReminder } from "@/lib/admin-test-reminder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.reason }, { status: 401 });

  const { orderId } = await ctx.params;
  return NextResponse.json({
    ok: true,
    route: "admin order test reminder",
    orderId,
    usage: "POST JSON: { kind: '8h' } ou { kind: '16h' }",
    fallback_route: "/api/admin/test-order-reminder",
  });
}

export async function POST(req: Request, ctx: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.reason }, { status: 401 });

  const { orderId } = await ctx.params;
  const payload = (await req.json().catch(() => ({}))) as { kind?: unknown; mark_sent?: unknown };
  return sendAdminTestReminder(orderId, payload.kind, Boolean(payload.mark_sent));
}
