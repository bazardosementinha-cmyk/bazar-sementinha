import nodemailer from "nodemailer";
import {
  getEmailConfigHealth,
  getEmailNotificationsEnabled,
  getSmtpFrom,
  parseBooleanEnv,
  parseSmtpPort,
  type EmailConfigHealth,
} from "@/lib/email-config";

export type MailInput = {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text: string;
  html?: string;
};

type TransportConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
};

type SendMailInfo = {
  messageId?: string;
  response?: string;
  accepted?: string[];
  rejected?: string[];
};

export type SendMailResult =
  | { ok: true; messageId?: string; response?: string; accepted?: string[]; rejected?: string[] }
  | { ok: false; error: string; code?: string; responseCode?: number; command?: string; stack?: string };

function clean(value: string | undefined | null): string {
  return String(value || "").trim();
}

function getTransportConfig(): TransportConfig | null {
  const host = clean(process.env.SMTP_HOST);
  const port = parseSmtpPort(process.env.SMTP_PORT);
  const user = clean(process.env.SMTP_USER);
  const pass = clean(process.env.SMTP_PASS);
  const secure = parseBooleanEnv(process.env.SMTP_SECURE, false);

  if (!host || !user || !pass) return null;

  return {
    host,
    port,
    secure,
    auth: { user, pass },
  };
}

function createTransporter(config: TransportConfig) {
  return nodemailer.createTransport(config);
}

function normalizeMailError(error: unknown): Extract<SendMailResult, { ok: false }> {
  const maybe = error as {
    message?: unknown;
    code?: unknown;
    responseCode?: unknown;
    command?: unknown;
    stack?: unknown;
  };

  return {
    ok: false,
    error: typeof maybe?.message === "string" ? maybe.message : "Falha ao enviar e-mail.",
    code: typeof maybe?.code === "string" ? maybe.code : undefined,
    responseCode: typeof maybe?.responseCode === "number" ? maybe.responseCode : undefined,
    command: typeof maybe?.command === "string" ? maybe.command : undefined,
    stack: typeof maybe?.stack === "string" ? maybe.stack : undefined,
  };
}

export function getMailHealth(): EmailConfigHealth {
  return getEmailConfigHealth();
}

export function isMailConfigured(): boolean {
  return Boolean(getTransportConfig() && getSmtpFrom());
}

export async function verifyMailConnection(): Promise<
  | { ok: true; health: EmailConfigHealth; nodemailerLoaded: true }
  | {
      ok: false;
      health: EmailConfigHealth;
      error: string;
      code?: string;
      responseCode?: number;
      command?: string;
      nodemailerLoaded?: boolean;
    }
> {
  const health = getMailHealth();
  const config = getTransportConfig();
  const from = getSmtpFrom();

  if (!config || !from) {
    return {
      ok: false,
      health,
      error: `SMTP incompleto. Faltando: ${health.missing.join(", ") || "configuração"}.`,
      nodemailerLoaded: Boolean(nodemailer?.createTransport),
    };
  }

  try {
    const transporter = createTransporter(config);

    if (typeof transporter.verify === "function") {
      await transporter.verify();
    }

    return { ok: true, health, nodemailerLoaded: true };
  } catch (error: unknown) {
    const normalized = normalizeMailError(error);
    return {
      ok: false,
      health,
      error: normalized.error,
      code: normalized.code,
      responseCode: normalized.responseCode,
      command: normalized.command,
      nodemailerLoaded: Boolean(nodemailer?.createTransport),
    };
  }
}

export async function sendMail(input: MailInput): Promise<SendMailResult> {
  if (!getEmailNotificationsEnabled()) {
    console.info("[mail] EMAIL_NOTIFICATIONS_ENABLED=false. Envio ignorado.");
    return { ok: true, response: "notifications_disabled" };
  }

  const health = getMailHealth();
  const config = getTransportConfig();
  if (!config) {
    const error = `SMTP não configurado. Faltando: ${health.missing.join(", ") || "configuração"}.`;
    console.error("[mail]", error, health);
    return { ok: false, error };
  }

  const from = getSmtpFrom();
  if (!from) {
    const error = "SMTP_FROM não configurado.";
    console.error("[mail]", error, health);
    return { ok: false, error };
  }

  try {
    const transporter = createTransporter(config);

    console.info("[mail] Enviando e-mail", {
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      host: health.host,
      port: health.port,
      secure: health.secure,
      user: health.userMasked,
      from: health.from,
    });

    const info = (await transporter.sendMail({
      from,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      text: input.text,
      html: input.html,
    })) as SendMailInfo;

    console.info("[mail] E-mail enviado", {
      messageId: info?.messageId,
      response: info?.response,
      accepted: info?.accepted,
      rejected: info?.rejected,
    });

    return {
      ok: true,
      messageId: info?.messageId,
      response: info?.response,
      accepted: info?.accepted,
      rejected: info?.rejected,
    };
  } catch (error: unknown) {
    const normalized = normalizeMailError(error);
    console.error("[mail] Falha ao enviar e-mail", {
      error: normalized.error,
      code: normalized.code,
      responseCode: normalized.responseCode,
      command: normalized.command,
      stack: normalized.stack,
      health,
    });
    return normalized;
  }
}
