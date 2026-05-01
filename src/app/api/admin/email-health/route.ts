import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getMailHealth, verifyMailConnection } from "@/lib/mail";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const url = new URL(req.url);
  const shouldVerify = url.searchParams.get("verify") === "1";

  if (!shouldVerify) {
    return NextResponse.json({
      ok: true,
      health: getMailHealth(),
      hint: "Para testar autenticação/conexão SMTP, acesse esta rota com ?verify=1.",
    });
  }

  const verification = await verifyMailConnection();
  const status = verification.ok ? 200 : 500;

  return NextResponse.json(verification, { status });
}
