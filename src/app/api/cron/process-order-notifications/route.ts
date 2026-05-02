import { NextResponse } from "next/server";
import { processOrderNotificationJobs } from "@/lib/order-notification-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const url = new URL(req.url);
  const userAgent = req.headers.get("user-agent") || "";
  const isVercelCron = userAgent.includes("vercel-cron/1.0");

  const expected = String(process.env.CRON_SECRET || "").trim();
  const provided =
    url.searchParams.get("secret") ||
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  return isVercelCron || Boolean(expected && provided === expected);
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await processOrderNotificationJobs();
    return NextResponse.json(result, { status: result.ok ? 200 : 207 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao processar notificações.";
    console.error("[cron/process-order-notifications] Falha geral", { error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
