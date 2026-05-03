import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "fallback test reminder route",
    usage: "Use /api/admin/orders/[orderId]/test-reminder ou envie POST para a rota dinâmica.",
  });
}
