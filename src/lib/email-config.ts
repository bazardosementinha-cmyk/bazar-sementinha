export type EmailConfigHealth = {
  notificationsEnabled: boolean;
  hostConfigured: boolean;
  portConfigured: boolean;
  secureConfigured: boolean;
  userConfigured: boolean;
  passConfigured: boolean;
  fromConfigured: boolean;
  adminCopyToConfigured: boolean;
  host: string | null;
  port: number;
  secure: boolean;
  userMasked: string | null;
  from: string | null;
  adminCopyTo: string | null;
  missing: string[];
};

function clean(value: string | undefined | null): string {
  return String(value || "").trim();
}

function stripWrappingQuotes(value: string): string {
  const trimmed = clean(value);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function parseBooleanEnv(value: string | undefined | null, defaultValue = false): boolean {
  const normalized = clean(value).toLowerCase();
  if (!normalized) return defaultValue;
  return ["1", "true", "yes", "sim", "on"].includes(normalized);
}

export function parseSmtpPort(value: string | undefined | null): number {
  const parsed = Number(clean(value) || "587");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
}

export function getEmailNotificationsEnabled(): boolean {
  return parseBooleanEnv(process.env.EMAIL_NOTIFICATIONS_ENABLED, true);
}

export function getAdminEmailCopyTo(): string | undefined {
  return stripWrappingQuotes(process.env.ADMIN_EMAIL_COPY_TO || "bazardosementinha@gmail.com") || undefined;
}

export function getSmtpFrom(): string {
  return stripWrappingQuotes(process.env.SMTP_FROM || process.env.SMTP_USER || "");
}

export function maskEmail(value: string | undefined | null): string | null {
  const raw = clean(value);
  if (!raw) return null;
  const [name, domain] = raw.split("@");
  if (!domain) return raw.length <= 4 ? "****" : `${raw.slice(0, 2)}***${raw.slice(-2)}`;
  const visible = name.length <= 2 ? name[0] || "*" : name.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function getEmailConfigHealth(): EmailConfigHealth {
  const notificationsEnabled = getEmailNotificationsEnabled();
  const host = clean(process.env.SMTP_HOST);
  const portRaw = clean(process.env.SMTP_PORT);
  const port = parseSmtpPort(portRaw);
  const secure = parseBooleanEnv(process.env.SMTP_SECURE, false);
  const user = clean(process.env.SMTP_USER);
  const pass = clean(process.env.SMTP_PASS);
  const from = getSmtpFrom();
  const adminCopyTo = getAdminEmailCopyTo() || "";

  const missing: string[] = [];
  if (!host) missing.push("SMTP_HOST");
  if (!portRaw) missing.push("SMTP_PORT");
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");
  if (!from) missing.push("SMTP_FROM");
  if (!adminCopyTo) missing.push("ADMIN_EMAIL_COPY_TO");

  return {
    notificationsEnabled,
    hostConfigured: Boolean(host),
    portConfigured: Boolean(portRaw),
    secureConfigured: clean(process.env.SMTP_SECURE) !== "",
    userConfigured: Boolean(user),
    passConfigured: Boolean(pass),
    fromConfigured: Boolean(from),
    adminCopyToConfigured: Boolean(adminCopyTo),
    host: host || null,
    port,
    secure,
    userMasked: maskEmail(user),
    from: from || null,
    adminCopyTo: adminCopyTo || null,
    missing,
  };
}
