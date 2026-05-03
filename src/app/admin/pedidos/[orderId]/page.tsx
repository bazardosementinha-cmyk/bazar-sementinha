"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ContextHelp from "@/components/ContextHelp";
import { ADMIN_HELP_TOPICS } from "@/lib/admin-help";
import { getReminderLabel, sortOrderReminders } from "@/lib/order-reminders";

type Order = {
  id: string;
  code: string;
  status: string;
  total: number;
  pix_key: string;
  pickup_location: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_whatsapp: string | null;
  customer_instagram: string | null;
  created_at: string;
  expires_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  payment_status?: string | null;
  payment_proof_path?: string | null;
  payment_proof_signed_url?: string | null;
  payment_proof_uploaded_at?: string | null;
  payment_proof_mime_type?: string | null;
  payment_proof_size_bytes?: number | null;
};

type OrderItem = {
  id: number;
  item_id: string;
  item_short_id: string;
  item_title: string;
  price: number;
};

type Reminder = {
  id: string;
  kind: "remind_8h" | "remind_16h";
  due_at: string;
  sent_at: string | null;
};

function brDateTime(iso: string | null | undefined) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return String(iso);
  }
}

function brMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function customerName(order: Order | null) {
  return (order?.customer_name || "Cliente").trim() || "Cliente";
}

function pickupFullAddress(order: Order | null) {
  const location = order?.pickup_location?.trim();
  if (!location || location === "TUCXA2") {
    return "Tucxa2 — Rua Francisco de Assis Pupo, 390 — Vila Industrial — Campinas/SP";
  }
  return location;
}

function statusLabel(status: string) {
  switch (status) {
    case "reserved":
      return "Reservado";
    case "paid":
      return "Pago";
    case "delivered":
      return "Entregue";
    case "cancelled":
    case "canceled":
      return "Cancelado";
    default:
      return status;
  }
}

function paymentStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "submitted":
      return "Comprovante enviado";
    case "confirmed":
      return "Pagamento confirmado";
    case "cancelled":
      return "Cancelado";
    case "rejected":
      return "Comprovante recusado";
    default:
      return "Aguardando comprovante";
  }
}

function isOrderClosedForReminders(order: Order | null) {
  if (!order) return false;
  if (["paid", "delivered", "cancelled", "canceled", "expired"].includes(order.status)) return true;
  if (["submitted", "confirmed"].includes(order.payment_status || "")) return true;
  return false;
}

function inactiveReminderReason(order: Order | null) {
  if (!order) return "";
  if (order.payment_status === "submitted") return "Inativo — comprovante enviado";
  if (order.status === "paid" || order.payment_status === "confirmed") return "Inativo — pedido pago";
  if (order.status === "delivered") return "Inativo — pedido entregue";
  if (["cancelled", "canceled", "expired"].includes(order.status)) return "Inativo — pedido cancelado";
  return "Inativo";
}

function fileSizeLabel(bytes: number | null | undefined) {
  if (!bytes || !Number.isFinite(bytes)) return "—";
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function copy(text: string) {
  await navigator.clipboard.writeText(text);
}

export default function PedidoDetalhePage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const resp = await fetch(`/api/admin/orders/${orderId}`);
    const data = await resp.json();
    if (!resp.ok) {
      setError(data?.error || "Falha ao carregar pedido");
      return;
    }
    setOrder(data.order as Order);
    setItems((data.items ?? []) as OrderItem[]);
    setReminders((data.reminders ?? []) as Reminder[]);
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const lines = useMemo(() => {
    return items.map(
      (i) => `• #${i.item_short_id} — ${i.item_title} — ${brMoney(Number(i.price) || 0)}`
    );
  }, [items]);

  const scheduledReminders = useMemo(() => sortOrderReminders(reminders), [reminders]);
  const remindersInactive = isOrderClosedForReminders(order);
  const reminderInactiveText = inactiveReminderReason(order);

  const initialMsg = useMemo(() => {
    if (!order) return "";
    return (
      `Olá ${customerName(order)}! 😊\n\n` +
      `Seu pedido *${order.code}* foi reservado no Bazar do Sementinha.\n` +
      `Total: *${brMoney(Number(order.total) || 0)}*\n\n` +
      `*Pix (chave):* ${order.pix_key}\n` +
      `📍 Retirada: *${pickupFullAddress(order)}*\n\n` +
      `Itens:\n${lines.join("\n")}\n\n` +
      `Prazo: reserve até *${brDateTime(order.expires_at)}*.\n` +
      `Por favor, peça ao cliente para enviar o comprovante pela tela de acompanhamento do pedido. Depois da conferência, a equipe combina a retirada no Tucxa2 — Rua Francisco de Assis Pupo, 390 — Vila Industrial — Campinas/SP.\n` +
      `Obrigado(a)!`
    );
  }, [order, lines]);

  const remind8 = useMemo(() => {
    if (!order) return "";
    return (
      `Olá ${customerName(order)}! Só um lembrete 😊\n\n` +
      `Seu pedido *${order.code}* segue reservado.\n` +
      `Prazo final: *${brDateTime(order.expires_at)}*.\n\n` +
      `Pix (chave): ${order.pix_key}\n` +
      `Após pagar, envie o comprovante pela tela de acompanhamento do pedido. Obrigado(a)!`
    );
  }, [order]);

  const remind16 = useMemo(() => {
    if (!order) return "";
    return (
      `Olá ${customerName(order)}! ⏳ Lembrete importante\n\n` +
      `Seu pedido *${order.code}* expira em breve.\n` +
      `Prazo final: *${brDateTime(order.expires_at)}*.\n\n` +
      `Pix (chave): ${order.pix_key}\n` +
      `Se o pagamento não for feito até o prazo, o pedido será cancelado e os itens voltam para o site.\n` +
      `Após pagar, envie o comprovante pela tela de acompanhamento do pedido. Obrigado(a)!`
    );
  }, [order]);

  const cancelMsg = useMemo(() => {
    if (!order) return "";
    return (
      `Olá ${customerName(order)}!\n\n` +
      `O pedido *${order.code}* foi cancelado por falta de pagamento até o prazo.\n` +
      `Os itens voltaram a ficar disponíveis no site.\n\n` +
      `Se quiser, você pode fazer um novo pedido a qualquer momento.\n` +
      `Obrigado(a)!`
    );
  }, [order]);

  async function action(action: "mark_paid" | "mark_delivered" | "cancel") {
    setBusy(action);
    setNotice(null);
    setError(null);
    const resp = await fetch(`/api/admin/orders/${orderId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setError(data?.error || "Falha na ação");
      setBusy(null);
      return;
    }
    setNotice("Ação aplicada com sucesso.");
    await load();
    setBusy(null);
  }

  async function markReminderSent(reminderId: string) {
    setBusy(reminderId);
    const resp = await fetch(`/api/admin/orders/${orderId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "mark_reminder_sent", reminder_id: reminderId }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setError(data?.error || "Falha ao marcar lembrete");
      setBusy(null);
      return;
    }
    await load();
    setBusy(null);
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="text-slate-600">Carregando...</div>
        {error ? <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pedido {order.code}</h1>
          <div className="mt-1 text-sm text-slate-600">
            Cliente: <b>{customerName(order)}</b> • Status: <b>{statusLabel(order.status)}</b> • Pagamento: <b>{paymentStatusLabel(order.payment_status)}</b> • Total: <b>{brMoney(Number(order.total) || 0)}</b>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Criado em {brDateTime(order.created_at)} • Expira em {brDateTime(order.expires_at)} • Retirada: {pickupFullAddress(order)}
          </div>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-xl border bg-white px-4 py-2 font-semibold hover:bg-slate-50" href="/admin/pedidos">Voltar</Link>
          <button onClick={() => void load()} className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-black">Atualizar</button>
        </div>
      </div>

      <ContextHelp topic={ADMIN_HELP_TOPICS.pedidoDetalhe} className="mt-4" />

      {error ? <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div> : null}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5">
          <div className="font-semibold">Itens do pedido</div>
          <ul className="mt-3 space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">#{i.item_short_id} — {i.item_title}</div>
                </div>
                <div className="font-semibold">{brMoney(Number(i.price) || 0)}</div>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              disabled={busy === "mark_paid" || order.status === "paid" || order.payment_status === "confirmed" || order.status === "delivered" || order.status === "cancelled" || order.status === "canceled"}
              onClick={() => void action("mark_paid")}
              className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
{order.status === "paid" || order.payment_status === "confirmed" ? "Pagamento confirmado" : "Confirmar pagamento"}
            </button>
            <button
              disabled={busy === "mark_delivered" || (order.status !== "paid" && order.status !== "reserved")}
              onClick={() => void action("mark_delivered")}
              className="rounded-xl bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Marcar como Entregue (vira vendido)
            </button>
            <button
              disabled={busy === "cancel" || order.status === "cancelled" || order.status === "delivered" || order.status === "paid" || order.payment_status === "submitted"}
              onClick={() => void action("cancel")}
              className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              Cancelar e liberar itens
            </button>
          </div>

          <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
            <div className="font-semibold">Comprovante Pix</div>
            <div className="mt-2 grid gap-1 text-sm text-slate-700">
              <div>Status: <b>{paymentStatusLabel(order.payment_status)}</b></div>
              <div>Enviado em: <b>{order.payment_proof_uploaded_at ? brDateTime(order.payment_proof_uploaded_at) : "—"}</b></div>
              <div>Tipo: <b>{order.payment_proof_mime_type || "—"}</b></div>
              <div>Tamanho: <b>{fileSizeLabel(order.payment_proof_size_bytes)}</b></div>
            </div>
            {order.payment_proof_signed_url ? (
              <a
                href={order.payment_proof_signed_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Abrir comprovante
              </a>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Nenhum comprovante enviado ainda.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <div className="font-semibold">Mensagens prontas (WhatsApp) — automação assistida</div>
          <p className="mt-1 text-sm text-slate-600">Copie a mensagem e envie no WhatsApp do cliente.</p>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-700">Mensagem inicial</div>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{initialMsg}</pre>
              <button onClick={() => void copy(initialMsg)} className="mt-2 rounded-lg border bg-white px-3 py-1 text-sm hover:bg-slate-50">Copiar</button>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-700">Lembrete 8h</div>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{remind8}</pre>
              <button onClick={() => void copy(remind8)} className="mt-2 rounded-lg border bg-white px-3 py-1 text-sm hover:bg-slate-50">Copiar</button>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-700">Lembrete 16h</div>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{remind16}</pre>
              <button onClick={() => void copy(remind16)} className="mt-2 rounded-lg border bg-white px-3 py-1 text-sm hover:bg-slate-50">Copiar</button>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-700">Cancelamento (pós-expiração)</div>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{cancelMsg}</pre>
              <button onClick={() => void copy(cancelMsg)} className="mt-2 rounded-lg border bg-white px-3 py-1 text-sm hover:bg-slate-50">Copiar</button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-5">
        <div className="font-semibold">Lembretes agendados (8h e 16h)</div>
        <p className="mt-1 text-sm text-slate-600">
          {remindersInactive
            ? "Pedido com pagamento/comprovante já encaminhado: lembretes pendentes ficam apenas como histórico e não serão enviados."
            : "O sistema agenda; você copia e envia no WhatsApp e marca como enviado."}
        </p>

        {remindersInactive ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {reminderInactiveText}. Lembretes futuros não precisam ser enviados.
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Quando enviar</th>
                <th className="px-3 py-2">Enviado?</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {scheduledReminders.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{getReminderLabel(r.kind)}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{brDateTime(r.due_at)}</td>
                  <td className="px-3 py-2 text-xs">{r.sent_at ? `Sim (${brDateTime(r.sent_at)})` : "Não"}</td>
                  <td className="px-3 py-2">
                    {r.sent_at ? (
                      <span className="text-xs text-slate-500">Histórico</span>
                    ) : remindersInactive ? (
                      <div className="text-xs font-semibold text-emerald-700">
                        {reminderInactiveText}<br />
                        <span className="font-normal">Não será enviado</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => void copy(r.kind === "remind_8h" ? remind8 : remind16)}
                          className="rounded-lg border bg-white px-2 py-1 hover:bg-slate-50"
                        >
                          Copiar msg
                        </button>
                        <button
                          disabled={!!r.sent_at || busy === r.id}
                          onClick={() => void markReminderSent(r.id)}
                          className="rounded-lg bg-slate-900 px-2 py-1 text-white hover:bg-black disabled:opacity-60"
                        >
                          Marcar enviado
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!scheduledReminders.length ? (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                    Nenhum lembrete encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
