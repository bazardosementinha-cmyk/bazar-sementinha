import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendAdminTestReminder } from "@/lib/admin-test-reminder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.reason }, { status: 401 });

  return NextResponse.json({
    ok: true,
    route: "admin test order reminder",
    usage: "POST JSON: { orderId: 'uuid-ou-ORD-XXXXX', kind: '8h' } ou { orderId: 'uuid-ou-ORD-XXXXX', kind: '16h' }",
    lookup: "UUID usa orders.id; código ORD-XXXXX usa orders.code.",
  });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.reason }, { status: 401 });

  const payload = (await req.json().catch(() => ({}))) as {
    orderId?: unknown;
    order_id?: unknown;
    code?: unknown;
    kind?: unknown;
    mark_sent?: unknown;
  };

  const orderIdOrCode = String(payload.orderId ?? payload.order_id ?? payload.code ?? "").trim();
  if (!orderIdOrCode) {
    return NextResponse.json({ ok: false, error: "Informe orderId, order_id ou code." }, { status: 400 });
  }

  return sendAdminTestReminder(orderIdOrCode, payload.kind, Boolean(payload.mark_sent));
}
