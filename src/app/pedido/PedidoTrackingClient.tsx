"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type PaymentPlan = "pix_now" | "card_pickup_deposit" | "pay_pickup_24h";

type TrackResponse =
  | {
      ok: true;
      order: {
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
        pix_key: string | null;
        pickup_location: string | null;
        customer_name: string | null;
      };
      items: Array<{
        short_id: string;
        title: string;
        price: number;
      }>;
      support: {
        whatsapp: string;
        pix_favored: string;
      };
    }
  | { error: string };

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function paymentPlanLabel(plan: PaymentPlan) {
  switch (plan) {
    case "pix_now":
      return "Pix agora (valor total)";
    case "card_pickup_deposit":
      return "Cartão na retirada (caução Pix)";
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

function nextActionText(data: Extract<TrackResponse, { ok: true }>) {
  const { order } = data;

  if (order.status === "cancelled" || order.status === "canceled") {
    return "Este pedido foi cancelado. Se precisar, fale com a equipe e confira itens disponíveis no catálogo.";
  }

  if (order.status === "delivered") {
    return "Pedido concluído. Obrigado por apoiar a ação social do Bazar do Sementinha 💚";
  }

  if (order.status === "paid") {
    return "Pagamento confirmado. Agora falta apenas combinar/confirmar a retirada.";
  }

  if (order.payment_plan === "pix_now") {
    const deadline = formatDateTime(order.expires_at);
    return deadline
      ? `Envie o comprovante do Pix até ${deadline}.`
      : "Envie o comprovante do Pix pelo WhatsApp.";
  }

  if (order.payment_plan === "card_pickup_deposit") {
    const deposit = typeof order.deposit_amount === "number" ? formatBRL(order.deposit_amount) : "R$ 10,00";
    const deadline = formatDateTime(order.pickup_deadline_at);
    return deadline
      ? `Envie a caução de ${deposit} e retire até ${deadline}.`
      : `Envie a caução de ${deposit} e combine a retirada.`;
  }

  const deadline = formatDateTime(order.expires_at);
  return deadline
    ? `Combine a retirada e faça o pagamento em até ${deadline}.`
    : "Combine a retirada pelo WhatsApp.";
}

function customerWhatsappLink(data: Extract<TrackResponse, { ok: true }>) {
  const { order, support } = data;
  const code = order.code;
  const total = formatBRL(order.total);
  const pixKey = order.pix_key || "";

  let text = "";

  if (order.status === "cancelled" || order.status === "canceled") {
    text = `Olá! Gostaria de ajuda com o pedido ${code}.`;
  } else if (order.payment_plan === "pix_now") {
    text =
      `Olá! Vou enviar agora o *print/comprovante do Pix* do pedido ${code}. ` +
      `Valor: ${total}. ` +
      `Chave Pix: ${pixKey} — ${support.pix_favored}.`;
  } else if (order.payment_plan === "card_pickup_deposit") {
    const deposit = typeof order.deposit_amount === "number" ? formatBRL(order.deposit_amount) : "R$ 10,00";
    text =
      `Olá! Vou enviar agora o *print/comprovante da caução Pix* do pedido ${code}. ` +
      `Valor da caução: ${deposit}. ` +
      `Chave Pix: ${pixKey} — ${support.pix_favored}.`;
  } else {
    text = `Olá! Quero combinar a retirada do pedido ${code}. Valor do pedido: ${total}.`;
  }

  return `https://wa.me/${support.whatsapp}?text=${encodeURIComponent(text)}`;
}

function buildTimeline(data: Extract<TrackResponse, { ok: true }>) {
  const { order } = data;
  const isCancelled = order.status === "cancelled" || order.status === "canceled";

  if (isCancelled) {
    return [
      { label: "Pedido criado", done: true, current: false },
      { label: "Pedido cancelado", done: true, current: true },
    ];
  }

  return [
    { label: "Pedido criado", done: true, current: order.status === "reserved" },
    {
      label: "Pagamento confirmado",
      done: order.status === "paid" || order.status === "delivered",
      current: order.status === "paid",
    },
    {
      label: "Entregue",
      done: order.status === "delivered",
      current: order.status === "delivered",
    },
  ];
}

export default function PedidoTrackingClient() {
  const sp = useSearchParams();

  const initialCode = sp.get("code") ?? "";
  const initialToken = sp.get("t") ?? "";

  const [code, setCode] = useState(initialCode);
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Extract<TrackResponse, { ok: true }> | null>(null);

  const canUseSecureLink = useMemo(
    () => Boolean(initialToken && code.trim().toUpperCase() === initialCode.trim().toUpperCase()),
    [initialToken, initialCode, code]
  );

  async function lookupOrder(opts?: { silent?: boolean }) {
    const normalizedCode = code.trim().toUpperCase();

    if (!normalizedCode) {
      setError("Informe o código do pedido.");
      return;
    }

    if (!canUseSecureLink && !contact.trim()) {
      setError("Informe seu WhatsApp ou e-mail para localizar o pedido.");
      return;
    }

    setLoading(true);
    if (!opts?.silent) setError(null);

    try {
      const payload: Record<string, string> = { code: normalizedCode };

      if (canUseSecureLink) {
        payload.token = initialToken;
      } else if (contact.includes("@")) {
        payload.email = contact.trim();
      } else {
        payload.whatsapp = contact.trim();
      }

      const res = await fetch("/api/public/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as TrackResponse;

      if (!res.ok) {
        throw new Error("error" in json ? json.error : "Não foi possível consultar o pedido.");
      }

      setData(json as Extract<TrackResponse, { ok: true }>);
      setError(null);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Erro ao consultar pedido.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialCode || !initialToken) return;
    void lookupOrder({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode, initialToken]);

  const timeline = useMemo(() => (data ? buildTimeline(data) : []), [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Acompanhar pedido</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Consulte status, prazo, pagamento e retirada do seu pedido.
          </p>
        </div>

        <Link href="/" className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-50">
          Voltar ao catálogo
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <div className="font-semibold">Consultar pedido</div>
        <p className="mt-1 text-sm text-neutral-600">
          Você pode usar o link seguro gerado após a compra ou informar o código do pedido com seu WhatsApp/e-mail.
        </p>

        <form
          className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            void lookupOrder();
          }}
        >
          <div>
            <label className="text-sm font-medium">Código do pedido</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex.: ORD-ABC123"
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">WhatsApp ou e-mail</label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={canUseSecureLink ? "Opcional para este link seguro" : "(DDD) 9xxxx-xxxx ou email"}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 md:w-auto"
            >
              {loading ? "Consultando…" : "Acompanhar pedido"}
            </button>
          </div>
        </form>

        {canUseSecureLink && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Este link seguro já libera o acesso ao pedido.
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Pedido {data.order.code}</div>
                <div className="mt-1 text-sm text-neutral-600">
                  {data.order.customer_name ? `Olá, ${data.order.customer_name}. ` : ""}
                  Abaixo está o status atual do seu pedido.
                </div>
              </div>

              <div className={`rounded-full border px-3 py-1 text-sm font-medium ${statusClasses(data.order.status)}`}>
                {statusLabel(data.order.status)}
              </div>
            </div>

            <div className="mt-4 rounded-xl border bg-neutral-50 p-4">
              <div className="font-semibold">Próxima ação</div>
              <div className="mt-1 text-sm text-neutral-700">{nextActionText(data)}</div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href={customerWhatsappLink(data)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
              >
                {data.order.payment_plan === "pay_pickup_24h"
                  ? "Falar no WhatsApp sobre retirada"
                  : "Enviar comprovante / falar no WhatsApp"}
              </a>

              <Link href="/" className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
                Continuar comprando
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-white p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Resumo</div>
              <div className="mt-2 text-sm text-neutral-700">
                <div><span className="font-medium">Total:</span> {formatBRL(data.order.total)}</div>
                <div className="mt-1">
                  <span className="font-medium">Criado em:</span>{" "}
                  {formatDateTime(data.order.created_at) || "—"}
                </div>
                <div className="mt-1">
                  <span className="font-medium">Pagamento:</span>{" "}
                  {paymentPlanLabel(data.order.payment_plan)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Pagamento</div>
              <div className="mt-2 text-sm text-neutral-700">
                {(data.order.payment_plan === "pix_now" || data.order.payment_plan === "card_pickup_deposit") && (
                  <>
                    <div><span className="font-medium">Chave Pix:</span> {data.order.pix_key || "—"}</div>
                    <div className="mt-1"><span className="font-medium">Favorecido:</span> {data.support.pix_favored}</div>
                  </>
                )}

                {data.order.payment_plan === "card_pickup_deposit" && (
                  <div className="mt-1">
                    <span className="font-medium">Caução:</span>{" "}
                    {typeof data.order.deposit_amount === "number"
                      ? formatBRL(data.order.deposit_amount)
                      : "R$ 10,00"}
                  </div>
                )}

                <div className="mt-1">
                  <span className="font-medium">Prazo:</span>{" "}
                  {formatDateTime(data.order.pickup_deadline_at || data.order.expires_at) || "—"}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Retirada</div>
              <div className="mt-2 text-sm text-neutral-700">
                <div><span className="font-medium">Local:</span> {data.order.pickup_location || "A combinar"}</div>
                <div className="mt-1">
                  <span className="font-medium">WhatsApp:</span> {data.support.whatsapp}
                </div>
                {data.order.delivered_at && (
                  <div className="mt-1">
                    <span className="font-medium">Entregue em:</span>{" "}
                    {formatDateTime(data.order.delivered_at)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="font-semibold">Itens do pedido</div>

            <div className="mt-4 space-y-3">
              {data.items.map((it) => (
                <div key={it.short_id} className="flex items-start justify-between gap-3 rounded-xl border p-4">
                  <div>
                    <div className="font-medium">{it.title}</div>
                    <div className="mt-1 text-sm text-neutral-600">#{it.short_id}</div>
                  </div>
                  <div className="font-semibold">{formatBRL(it.price)}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <div className="text-sm text-neutral-600">Total</div>
              <div className="text-lg font-semibold">{formatBRL(data.order.total)}</div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="font-semibold">Andamento do pedido</div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {timeline.map((step) => (
                <div
                  key={step.label}
                  className={`rounded-xl border p-4 ${
                    step.current
                      ? "border-emerald-200 bg-emerald-50"
                      : step.done
                        ? "border-neutral-200 bg-neutral-50"
                        : "border-neutral-200 bg-white"
                  }`}
                >
                  <div className="text-sm font-semibold">{step.label}</div>
                  <div className="mt-1 text-xs text-neutral-600">
                    {step.current ? "Etapa atual" : step.done ? "Concluído" : "Aguardando"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}