import { buildTrackingAbsoluteUrl } from "@/lib/order-links";

const PICKUP_FULL = "Tucxa2 — Rua Francisco de Assis Pupo, 390 — Vila Industrial — Campinas/SP";
const BAZAR_CC = "bazardosementinha@gmail.com";

export type MailOrderItem = {
  item_short_id: string;
  item_title: string;
  price: number;
};

export type MailOrder = {
  code: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_whatsapp: string | null;
  total: number;
  pix_key: string | null;
  pickup_location: string | null;
  expires_at: string | null;
  pickup_deadline_at?: string | null;
};

function brMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function brDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("pt-BR");
}

function customerName(name: string | null | undefined): string {
  return (name || "cliente").trim() || "cliente";
}

function itemsText(items: MailOrderItem[]): string {
  return items.map((item) => `• #${item.item_short_id} — ${item.item_title} — ${brMoney(Number(item.price) || 0)}`).join("\n");
}

function itemsHtml(items: MailOrderItem[]): string {
  return `<ul>${items
    .map(
      (item) =>
        `<li><strong>#${item.item_short_id}</strong> — ${escapeHtml(item.item_title)} — ${escapeHtml(brMoney(Number(item.price) || 0))}</li>`
    )
    .join("")}</ul>`;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function trackingUrl(order: MailOrder): string {
  return buildTrackingAbsoluteUrl(order.code, order.customer_whatsapp || "");
}

export function buildOrderCreatedEmail(order: MailOrder, items: MailOrderItem[]) {
  const name = customerName(order.customer_name);
  const link = trackingUrl(order);
  const deadline = order.pickup_deadline_at || order.expires_at;
  const subject = `Bazar do Sementinha • Pedido ${order.code} criado com sucesso`;

  const text = [
    `Olá, ${name}!`,
    "",
    `Seu pedido ${order.code} foi criado com sucesso no Bazar do Sementinha.`,
    `Total: ${brMoney(order.total)}.`,
    order.pix_key ? `Chave Pix: ${order.pix_key}.` : null,
    deadline ? `Prazo: ${brDateTime(deadline)}.` : null,
    `Retirada: ${PICKUP_FULL}.`,
    "",
    "Itens do pedido:",
    itemsText(items),
    "",
    `Acompanhe seu pedido: ${link}`,
    "",
    "Se o pagamento for por Pix, envie o comprovante por e-mail respondendo esta mensagem ou pelo WhatsApp e combinamos a retirada no Tucxa2.",
    "",
    "Obrigado por apoiar o Bazar do Sementinha!",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937">
      <h2>Bazar do Sementinha</h2>
      <p>Olá, <strong>${escapeHtml(name)}</strong>!</p>
      <p>Seu pedido <strong>${escapeHtml(order.code)}</strong> foi criado com sucesso.</p>
      <p><strong>Total:</strong> ${escapeHtml(brMoney(order.total))}<br/>
      ${order.pix_key ? `<strong>Chave Pix:</strong> ${escapeHtml(order.pix_key)}<br/>` : ""}
      ${deadline ? `<strong>Prazo:</strong> ${escapeHtml(brDateTime(deadline))}<br/>` : ""}
      <strong>Retirada:</strong> ${escapeHtml(PICKUP_FULL)}</p>
      <h3>Itens do pedido</h3>
      ${itemsHtml(items)}
      <p><a href="${escapeHtml(link)}">Clique aqui para acompanhar seu pedido</a></p>
      <p>Se o pagamento for por Pix, envie o comprovante respondendo este e-mail ou pelo WhatsApp e combinamos a retirada no Tucxa2.</p>
      <p>Obrigado por apoiar o Bazar do Sementinha!</p>
    </div>`;

  return { subject, text, html, cc: BAZAR_CC };
}

export function buildReminderEmail(order: MailOrder, kind: "remind_8h" | "remind_16h", items: MailOrderItem[]) {
  const name = customerName(order.customer_name);
  const link = trackingUrl(order);
  const deadline = order.expires_at || order.pickup_deadline_at;
  const label = kind === "remind_8h" ? "Lembrete 8h" : "Lembrete 16h";
  const subject = `Bazar do Sementinha • ${label} do pedido ${order.code}`;

  const text = [
    `Olá, ${name}!`,
    "",
    `Este é um ${kind === "remind_8h" ? "lembrete" : "lembrete importante"} do pedido ${order.code}.`,
    deadline ? `Prazo final: ${brDateTime(deadline)}.` : null,
    order.pix_key ? `Chave Pix: ${order.pix_key}.` : null,
    "",
    "Itens do pedido:",
    itemsText(items),
    "",
    `Acompanhe seu pedido: ${link}`,
    "",
    "Após o pagamento, envie o comprovante por e-mail respondendo esta mensagem ou pelo WhatsApp. A retirada é no Tucxa2 — Rua Francisco de Assis Pupo, 390 — Vila Industrial — Campinas/SP.",
    "",
    "Obrigado!",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937">
      <h2>Bazar do Sementinha</h2>
      <p>Olá, <strong>${escapeHtml(name)}</strong>!</p>
      <p>Este é um ${kind === "remind_8h" ? "lembrete" : "lembrete importante"} do pedido <strong>${escapeHtml(order.code)}</strong>.</p>
      <p>${deadline ? `<strong>Prazo final:</strong> ${escapeHtml(brDateTime(deadline))}<br/>` : ""}
      ${order.pix_key ? `<strong>Chave Pix:</strong> ${escapeHtml(order.pix_key)}` : ""}</p>
      <h3>Itens do pedido</h3>
      ${itemsHtml(items)}
      <p><a href="${escapeHtml(link)}">Clique aqui para acompanhar seu pedido</a></p>
      <p>Após o pagamento, envie o comprovante respondendo este e-mail ou pelo WhatsApp. A retirada é no Tucxa2 — Rua Francisco de Assis Pupo, 390 — Vila Industrial — Campinas/SP.</p>
      <p>Obrigado!</p>
    </div>`;

  return { subject, text, html, cc: BAZAR_CC };
}

export function buildCancellationEmail(order: MailOrder, items: MailOrderItem[]) {
  const name = customerName(order.customer_name);
  const link = trackingUrl(order);
  const subject = `Bazar do Sementinha • Pedido ${order.code} cancelado por expiração`;

  const text = [
    `Olá, ${name}!`,
    "",
    `O pedido ${order.code} foi cancelado por falta de pagamento até o prazo.`,
    "Os itens voltaram a ficar disponíveis no site.",
    "",
    "Itens que estavam reservados:",
    itemsText(items),
    "",
    `Acompanhe o histórico do pedido: ${link}`,
    "",
    "Se quiser, você pode fazer um novo pedido a qualquer momento.",
    "",
    "Obrigado!",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937">
      <h2>Bazar do Sementinha</h2>
      <p>Olá, <strong>${escapeHtml(name)}</strong>!</p>
      <p>O pedido <strong>${escapeHtml(order.code)}</strong> foi cancelado por falta de pagamento até o prazo.</p>
      <p>Os itens voltaram a ficar disponíveis no site.</p>
      <h3>Itens que estavam reservados</h3>
      ${itemsHtml(items)}
      <p><a href="${escapeHtml(link)}">Clique aqui para acompanhar o histórico do pedido</a></p>
      <p>Se quiser, você pode fazer um novo pedido a qualquer momento.</p>
      <p>Obrigado!</p>
    </div>`;

  return { subject, text, html, cc: BAZAR_CC };
}
