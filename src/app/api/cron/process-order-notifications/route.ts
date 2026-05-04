import { NextResponse } from "next/server";
import { processOrderNotifications } from "@/lib/order-notification-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CronQuery = {
  dry_run?: string | null;
  dryRun?: string | null;
  limit?: string | null;
};

function getBearerToken(req: Request): string {
  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function isAuthorized(req: Request): boolean {
  const secret = String(process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  return getBearerToken(req) === secret;
}

function isTruthy(value: string | null | undefined): boolean {
  return ["1", "true", "yes", "sim", "on"].includes(String(value || "").trim().toLowerCase());
}

function parseLimit(value: string | null | undefined): number | undefined {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.min(Math.max(Math.floor(parsed), 1), 200);
}

function queryFromUrl(req: Request): CronQuery {
  const url = new URL(req.url);
  return {
    dry_run: url.searchParams.get("dry_run"),
    dryRun: url.searchParams.get("dryRun"),
    limit: url.searchParams.get("limit"),
  };
}

async function run(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: "Não autorizado. Envie Authorization: Bearer CRON_SECRET." },
      { status: 401 }
    );
  }

  const query = queryFromUrl(req);
  const result = await processOrderNotifications({
    dryRun: isTruthy(query.dry_run) || isTruthy(query.dryRun),
    limit: parseLimit(query.limit),
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
