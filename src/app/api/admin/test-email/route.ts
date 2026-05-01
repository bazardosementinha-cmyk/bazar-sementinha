import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminEmailCopyTo } from "@/lib/email-config";
import { getMailHealth, sendMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TestEmailBody = {
  to?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
}

function defaultRecipient(): string {
  return process.env.SMTP_USER || getAdminEmailCopyTo() || "";
}

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  return NextResponse.json({
    ok: true,
    message:
      "Use POST nesta rota para enviar um e-mail de teste. Exemplo: { \"to\": \"seu-email@gmail.com\" }.",
    default_to: defaultRecipient(),
    cc: getAdminEmailCopyTo() || null,
    health: getMailHealth(),
  });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as TestEmailBody;
  const to = (asString(body.to) || defaultRecipient()).trim().toLowerCase();

  if (!to || !isValidEmail(to)) {
    return NextResponse.json({ error: "Informe um e-mail de destino válido no campo to." }, { status: 400 });
  }

  const now = new Date().toLocaleString("pt-BR");
  const cc = getAdminEmailCopyTo();

  const result = await sendMail({
    to,
    cc,
    subject: `Teste de e-mail • Bazar do Sementinha • ${now}`,
    text:
      `Este é um e-mail de teste do Bazar do Sementinha.\n\n` +
      `Se você recebeu esta mensagem, o SMTP está funcionando no ambiente atual.\n\n` +
      `Data/hora do teste: ${now}\n`,
    html:
      `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937">` +
      `<h2>Teste de e-mail — Bazar do Sementinha</h2>` +
      `<p>Se você recebeu esta mensagem, o SMTP está funcionando no ambiente atual.</p>` +
      `<p><strong>Data/hora do teste:</strong> ${now}</p>` +
      `</div>`,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        code: result.code,
        responseCode: result.responseCode,
        command: result.command,
        health: getMailHealth(),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    to,
    cc: cc || null,
    messageId: result.messageId,
    response: result.response,
    accepted: result.accepted,
    rejected: result.rejected,
  });
}
