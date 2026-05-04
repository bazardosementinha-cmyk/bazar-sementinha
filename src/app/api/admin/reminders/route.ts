import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { processOrderNotifications } from "@/lib/order-notification-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.reason }, { status: 401 });

  return NextResponse.json({
    ok: true,
    route: "admin reminders",
    usage: "POST JSON: { dryRun: true } para simular ou { dryRun: false } para processar lembretes vencidos.",
  });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.reason }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { dryRun?: boolean; dry_run?: boolean; limit?: number };
  const result = await processOrderNotifications({
    dryRun: Boolean(body.dryRun ?? body.dry_run),
    limit: Number(body.limit || 50),
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
