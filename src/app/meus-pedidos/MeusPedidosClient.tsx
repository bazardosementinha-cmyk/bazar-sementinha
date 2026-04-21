"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PaymentPlan = "pix_now" | "card_pickup_deposit" | "pay_pickup_24h";

type OrdersListResponse =
  | {
      ok: true;
      customer: {
        email: string;
        whatsapp: string;
        name: string | null;
      };
      orders: Array<{
        code: string;
        status: string;
        total: number;
        created_at: string | null;
        expires_at: string | null;
        pickup_deadline_at: string | null;
        payment_plan: PaymentPlan;
        deposit_amount: number | null;
        deposit_required: boolean;
        deposit_paid: boolean;
        paid_at: string | null;
        delivered_at: string | null;
        cancelled_at: string | null;
        pickup_location: string | null;
        pix_key: string | null;
        tracking_url: string;
        items: Array<{
          short_id: string;
          title: string;
          price: number;
        }>;
      }>;
      support: {
        whatsapp: string;
        pix_favored: string;
      };
    }
  | { error: string };

const ACCESS_KEY = "bazar_customer_access";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function paymentPlanLabel(plan: PaymentPlan) {
  switch (plan) {
    case "pix_now":
      return "Pix agora (valor total)";
    case "card_pickup_deposit":
      return "Cartão na retirada (caução PIX R$ 10,00)";
    case "pay_pickup_24h":
      return "Pagar na retirada";
    default:
      return "Forma de pagamento";
  }
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

function statusClasses(status: string) {
  switch (status) {
    case "reserved":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "delivered":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "cancelled":
    case "canceled":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

function orderDeadlineText(order: Extract<OrdersListResponse, { ok: true }>['orders'][number]) {
  if (order.payment_plan === "pix_now") {
    const deadline = formatDateTime(order.expires_at);
    return deadline ? `Pagamento/compovante até ${deadline}` : "Pagamento em até 24h";
  }
  if (order.payment_plan === "card_pickup_deposit") {
    const deadline = formatDateTime(order.pickup_deadline_at);
    return deadline ? `Retirada até ${deadline}` : "Retirada em até 15 dias";
  }
  return "Aguardando definição";
}

function buildWhatsappUrl(
  order: Extract<OrdersListResponse, { ok: true }>['orders'][number],
  support: Extract<OrdersListResponse, { ok: true }>['support']
) {
  const total = formatBRL(order.total);
  const deposit = typeof order.deposit_amount === "number" ? formatBRL(order.deposit_amount) : "R$ 10,00";
  const text =
    order.payment_plan === "pix_now"
      ? `Olá! Vou enviar agora o *print/comprovante do Pix* do pedido ${order.code}. Valor: ${total}. Chave Pix: ${order.pix_key || ""} — ${support.pix_favored}.`
      : `Olá! Vou enviar agora o *print/comprovante da caução Pix* do pedido ${order.code}. Valor da caução: ${deposit}. Chave Pix: ${order.pix_key || ""} — ${support.pix_favored}.`;
  return `https://wa.me/${support.whatsapp}?text=${encodeURIComponent(text)}`;
}

export default function MeusPedidosClient() {
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Extract<OrdersListResponse, { ok: true }> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACCESS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { email?: string; whatsapp?: string };
      if (parsed.email) setEmail(parsed.email);
      if (parsed.whatsapp) setWhatsapp(parsed.whatsapp);
    } catch {
      // ignore
    }
  }, []);

  async function loadOrders(nextEmail?: string, nextWhatsapp?: string) {
    const safeEmail = (nextEmail ?? email).trim().toLowerCase();
    const safeWhatsapp = (nextWhatsapp ?? whatsapp).trim();

    if (!safeEmail) {
      setError("Informe seu e-mail.");
      return;
    }

    if (!safeWhatsapp) {
      setError("Informe seu WhatsApp.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/public/orders/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: safeEmail, whatsapp: safeWhatsapp }),
      });

      const json = (await res.json()) as OrdersListResponse;
      if (!res.ok) throw new Error("error" in json ? json.error : "Erro ao consultar pedidos.");

      const okData = json as Extract<OrdersListResponse, { ok: true }>;
      setData(okData);
      localStorage.setItem(ACCESS_KEY, JSON.stringify({ email: safeEmail, whatsapp: safeWhatsapp }));
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Erro ao consultar pedidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (email && whatsapp) {
      void loadOrders(email, whatsapp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, whatsapp]);

  const ordersCount = useMemo(() => data?.orders.length ?? 0, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Meus pedidos</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Consulte todos os seus pedidos com o mesmo e-mail e WhatsApp usados no checkout.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
            Trocar acesso
          </Link>
          <Link href="/" className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
            Voltar ao catálogo
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <div className="font-semibold">Acesso do cliente</div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="text-sm font-medium">E-mail</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">WhatsApp</label>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(DD) 9xxxx-xxxx"
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadOrders()}
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 md:w-auto"
            >
              {loading ? "Consultando…" : "Atualizar"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {data && (
        <div className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Resumo da conta</div>
              <div className="mt-1 text-sm text-neutral-600">
                {data.customer.name ? `${data.customer.name} • ` : ""}
                {data.customer.email}
              </div>
            </div>
            <div className="rounded-full border bg-neutral-50 px-3 py-1 text-sm text-neutral-700">
              {ordersCount} pedido{ordersCount === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      )}

      {data && data.orders.length === 0 && (
        <div className="rounded-2xl border bg-white p-5 text-sm text-neutral-700">
          Nenhum pedido encontrado para esse e-mail e WhatsApp.
        </div>
      )}

      {data?.orders.map((order) => (
        <div key={order.code} className="rounded-2xl border bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">Pedido {order.code}</div>
              <div className="mt-1 text-sm text-neutral-600">
                Criado em {formatDateTime(order.created_at) || "—"} • {paymentPlanLabel(order.payment_plan)}
              </div>
            </div>
            <div className={`rounded-full border px-3 py-1 text-sm font-medium ${statusClasses(order.status)}`}>
              {statusLabel(order.status)}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-neutral-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Total</div>
              <div className="mt-1 text-lg font-semibold">{formatBRL(order.total)}</div>
            </div>
            <div className="rounded-xl border bg-neutral-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Prazo</div>
              <div className="mt-1 text-sm font-medium text-neutral-800">{orderDeadlineText(order)}</div>
            </div>
            <div className="rounded-xl border bg-neutral-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Retirada</div>
              <div className="mt-1 text-sm text-neutral-800">{order.pickup_location || "A combinar"}</div>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="font-semibold">Itens</div>
            <div className="mt-3 space-y-3">
              {order.items.map((item) => (
                <div key={`${order.code}-${item.short_id}`} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="mt-1 text-sm text-neutral-600">#{item.short_id}</div>
                  </div>
                  <div className="font-semibold">{formatBRL(item.price)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={order.tracking_url} className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
              Ver detalhes do pedido
            </Link>

            {(order.payment_plan === "pix_now" || order.payment_plan === "card_pickup_deposit") && order.status === "reserved" && (
              <a
                href={buildWhatsappUrl(order, data.support)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
              >
                Enviar comprovante no WhatsApp
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
