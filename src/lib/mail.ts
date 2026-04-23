export type MailInput = {
  to: string;
  cc?: string;
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

type SendMailOptions = {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  text: string;
  html?: string;
};

type MailTransporter = {
  sendMail(options: SendMailOptions): Promise<unknown>;
};

type NodemailerModule = {
  createTransport(config: TransportConfig): MailTransporter;
};

function parsePort(value: string | undefined): number {
  const n = Number(value || "587");
  return Number.isFinite(n) ? n : 587;
}

function getTransportConfig(): TransportConfig | null {
  const host = process.env.SMTP_HOST || "";
  const port = parsePort(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

  if (!host || !user || !pass) return null;

  return {
    host,
    port,
    secure,
    auth: { user, pass },
  };
}

async function getNodemailer(): Promise<NodemailerModule> {
  const importer = new Function("moduleName", "return import(moduleName)") as (
    moduleName: string
  ) => Promise<unknown>;

  const imported = await importer("nodemailer");

  const mod = imported as
    | NodemailerModule
    | {
        default?: NodemailerModule;
      };

  if ("default" in mod && mod.default) {
    return mod.default;
  }

  return mod as NodemailerModule;
}

export function isMailConfigured(): boolean {
  return Boolean(getTransportConfig());
}

export async function sendMail(
  input: MailInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = getTransportConfig();
  if (!config) {
    return { ok: false, error: "SMTP não configurado." };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "";
  if (!from) {
    return { ok: false, error: "SMTP_FROM não configurado." };
  }

  try {
    const nodemailer = await getNodemailer();
    const transporter = nodemailer.createTransport(config);

    await transporter.sendMail({
      from,
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao enviar e-mail.",
    };
  }
}