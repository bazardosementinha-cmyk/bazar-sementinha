import { NextResponse } from "next/server";
import { processOrderNotifications } from "@/lib/order-notification-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";

  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  const headerSecret = req.headers.get("x-cron-secret")?.trim();

  return bearer === secret || headerSecret === secret;
}

function optionsFromUrl(req: Request) {
  const url = new URL(req.url);
  return {
    dryRun: url.searchParams.get("dry_run") === "1" || url.searchParams.get("dryRun") === "1",
    limit: Number(url.searchParams.get("limit") || "50"),
  };
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Não autorizado. Informe Authorization: Bearer CRON_SECRET." }, { status: 401 });
  }

  const result = await processOrderNotifications(optionsFromUrl(req));
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Não autorizado. Informe Authorization: Bearer CRON_SECRET." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { dryRun?: boolean; dry_run?: boolean; limit?: number };
  const result = await processOrderNotifications({
    dryRun: Boolean(body.dryRun ?? body.dry_run),
    limit: Number(body.limit || 50),
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
