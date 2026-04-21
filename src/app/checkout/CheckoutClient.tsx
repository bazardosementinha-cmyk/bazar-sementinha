"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";

type ItemStatus = "review" | "available" | "reserved" | "sold";
type PaymentPlan = "pix_now" | "card_pickup_deposit";

type PublicItem = {
  id: string;
  short_id: string;
  title: string | null;
  category: string | null;
  condition: string | null;
  size: string | null;
  price: number | null;
  status: ItemStatus;
};

type CreatedOrderItem = {
  short_id: string;
  title: string | null;
  price: number | null;
};

type CreateOrderSuccess = {
  ok: true;
  order: {
    id: string;
    code: string;
    status: string;
    total: number;
    payment_plan: PaymentPlan;
    deposit_required: boolean;
    deposit_amount: number | null;
    expires_at: string | null;
    pickup_deadline_at: string | null;
    items: CreatedOrderItem[];
  };
  pix: { key: string; favored: string };
  whatsapp_url: string;
  tracking: { url: string };
};

type CreateOrderResponse = CreateOrderSuccess | { error: string };

const CART_LS_KEY = "bazar_cart";
const CUSTOMER_LS_KEY = "bazar_customer";
const CUSTOMER_ACCESS_LS_KEY = "bazar_customer_access";
const LAST_ORDER_SESSION_KEY = "bazar_last_order_summary";

const PIX_KEY = "58.392.598/0001-91";
const PIX_FAVORED = "Templo de Umbanda Caboclo Sete Flexa";
const SUPPORT_WA = "5519992360856";

function readCart(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_LS_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr.filter((x) => typeof x === "string") as string[]) : [];
  } catch {
    return [];
  }
}

function writeCart(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_LS_KEY, JSON.stringify(Array.from(new Set(ids))));
  window.dispatchEvent(new Event("bazar_cart_updated"));
  window.dispatchEvent(new Event("storage"));
}

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

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function paymentPlanLabel(plan: PaymentPlan) {
  switch (plan) {
    case "pix_now":
      return "Pix agora (valor total)";
    case "card_pickup_deposit":
      return "Cartão na retirada (caução PIX R$ 10,00)";
    default:
      return "Forma de pagamento";
  }
}

function paymentDeadlineText(order: CreateOrderSuccess["order"]) {
  if (order.payment_plan === "pix_now") {
    const deadline = formatDateTime(order.expires_at);
    return deadline
      ? `Envie o comprovante do Pix em até 24 horas após a criação do pedido. Prazo limite estimado: ${deadline}.`
      : "Envie o comprovante do Pix em até 24 horas após a criação do pedido.";
  }

  const deadline = formatDateTime(order.pickup_deadline_at);
  const deposit = typeof order.deposit_amount === "number" ? formatBRL(order.deposit_amount) : "R$ 10,00";
  return deadline
    ? `Envie a caução de ${deposit} e combine a retirada em até 15 dias. Prazo limite estimado: ${deadline}.`
    : `Envie a caução de ${deposit} e combine a retirada em até 15 dias.`;
}

function paymentNextStepText(order: CreateOrderSuccess["order"]) {
  if (order.payment_plan === "pix_now") {
    return "Use o botão abaixo para enviar o print/comprovante do Pix e acertar a retirada no Tucxa2 pelo WhatsApp.";
  }

  const deposit = typeof order.deposit_amount === "number" ? formatBRL(order.deposit_amount) : "R$ 10,00";
  return `Use o botão abaixo para enviar o comprovante da caução de ${deposit} e acertar a retirada no Tucxa2 pelo WhatsApp.`;
}

function shouldShowPixBox(order: CreateOrderSuccess["order"]) {
  return order.payment_plan === "pix_now" || order.payment_plan === "card_pickup_deposit";
}

function buildOrderWhatsappLink(order: CreateOrderSuccess["order"]) {
  const totalBr = formatBRL(order.total);
  const depositBr = typeof order.deposit_amount === "number" ? formatBRL(order.deposit_amount) : "R$ 10,00";

  const text =
    order.payment_plan === "pix_now"
      ? `Olá! Vou enviar agora o *print/comprovante do Pix* do pedido ${order.code}. Valor: ${totalBr}. Chave Pix: ${PIX_KEY} — ${PIX_FAVORED}.`
      : `Olá! Vou enviar agora o *print/comprovante da caução Pix* do pedido ${order.code}. Valor da caução: ${depositBr}. Chave Pix: ${PIX_KEY} — ${PIX_FAVORED}.`;

  return `https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(text)}`;
}

function persistCustomer(data: {
  name: string;
  whatsapp: string;
  email: string;
  optInMarketing: boolean;
}) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOMER_LS_KEY, JSON.stringify(data));
}

function persistCustomerAccess(data: { email: string; whatsapp: string }) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    CUSTOMER_ACCESS_LS_KEY,
    JSON.stringify({ email: normalizeEmail(data.email), whatsapp: data.whatsapp.trim() })
  );
}

function restoreLastOrderFromSession(code: string | null): CreateOrderSuccess | null {
  if (typeof window === "undefined" || !code) return null;

  try {
    const raw = sessionStorage.getItem(LAST_ORDER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CreateOrderSuccess;
    if (parsed?.ok && parsed?.order?.code === code) return parsed;
    return null;
  } catch {
    return null;
  }
}

export default function CheckoutClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const buy = sp.get("buy");
  const okCode = sp.get("ok");
  const isCompleted = Boolean(okCode);

  const [items, setItems] = useState<PublicItem[]>([]);
  const [cartSnapshot, setCartSnapshot] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [optInMarketing, setOptInMarketing] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("pix_now");

  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreateOrderSuccess | null>(null);

  const total = useMemo(() => items.reduce((acc, it) => acc + (Number(it.price) || 0), 0), [items]);

  const purchasedShortIds = useMemo(
    () => (created?.ok ? created.order.items.map((it) => it.short_id) : []),
    [created]
  );

  const refresh = useCallback(async () => {
    const cartShortIds = readCart();

    if (buy && !cartShortIds.includes(buy)) {
      const nextIds = [...cartShortIds, buy];
      writeCart(nextIds);
      setCartSnapshot(nextIds);
    }

    const ids = readCart();
    setCartSnapshot(ids);

    if (ids.length === 0) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const qs = encodeURIComponent(ids.join(","));
      const res = await fetch(`/api/public/items?short_ids=${qs}`, { cache: "no-store" });
      const data = (await res.json()) as { items?: PublicItem[]; error?: string };

      if (!res.ok) throw new Error(data?.error || "Falha ao carregar itens.");

      const loaded = Array.isArray(data.items) ? data.items : [];
      setItems(loaded);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Erro ao carregar itens.");
    } finally {
      setLoading(false);
    }
  }, [buy]);

  useEffect(() => {
    if (isCompleted) {
      setItems([]);
      setCartSnapshot([]);
      return;
    }
    void refresh();
  }, [refresh, isCompleted]);

  useEffect(() => {
    if (!okCode || created) return;
    const restored = restoreLastOrderFromSession(okCode);
    if (restored) setCreated(restored);
  }, [okCode, created]);

  function fillSaved() {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(CUSTOMER_LS_KEY);
      if (!raw) return;

      const obj = JSON.parse(raw) as {
        name?: string;
        whatsapp?: string;
        email?: string;
        optInMarketing?: boolean;
      };

      if (obj.name) setName(obj.name);
      if (obj.whatsapp) setWhatsapp(obj.whatsapp);
      if (obj.email) setEmail(obj.email);
      if (obj.optInMarketing) setOptInMarketing(true);
    } catch {
      // ignore
    }
  }

  async function createOrder() {
    setError(null);
    setCreated(null);

    const cartShortIds = cartSnapshot.length > 0 ? cartSnapshot : readCart();

    if (cartShortIds.length === 0) {
      setError("Carrinho vazio.");
      return;
    }

    if (!name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }

    if (!whatsapp.trim()) {
      setError("WhatsApp é obrigatório.");
      return;
    }

    if (!email.trim()) {
      setError("E-mail é obrigatório.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Informe um e-mail válido.");
      return;
    }

    setCreating(true);

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart_short_ids: cartShortIds,
          payment_plan: paymentPlan,
          customer: {
            name: name.trim(),
            whatsapp: whatsapp.trim(),
            email: normalizeEmail(email),
            instagram: null,
            opt_in_marketing: optInMarketing,
          },
        }),
      });

      const data = (await res.json()) as CreateOrderResponse;
      if (!res.ok) throw new Error("error" in data ? data.error : "Falha ao criar pedido.");

      const okData = data as CreateOrderSuccess;

      persistCustomer({
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        email: normalizeEmail(email),
        optInMarketing,
      });
      persistCustomerAccess({
        email: normalizeEmail(email),
        whatsapp: whatsapp.trim(),
      });

      if (typeof window !== "undefined") {
        sessionStorage.setItem(LAST_ORDER_SESSION_KEY, JSON.stringify(okData));
      }

      setCreated(okData);
      writeCart([]);
      setItems([]);
      setCartSnapshot([]);

      router.replace(`/checkout?ok=${encodeURIComponent(okData.order.code)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar pedido.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{isCompleted ? "Pedido finalizado" : "Finalizar pedido"}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {isCompleted
              ? "Seu pedido foi criado com sucesso. Acompanhe o status e, se necessário, envie o comprovante pelo WhatsApp."
              : "Informe seus dados para atendimento no WhatsApp e acesso aos seus pedidos."}
          </p>
        </div>

        <Link
          href={isCompleted ? "/meus-pedidos" : "/carrinho"}
          className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-50"
        >
          {isCompleted ? "Meus pedidos" : "Voltar ao carrinho"}
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {isCompleted && okCode && <OrderCompletionCard created={created} okCode={okCode} />}

      {!isCompleted && (
        <>
          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="font-semibold">Itens</div>
              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                Atualizar
              </button>
            </div>

            {loading ? (
              <div className="mt-3 text-sm text-neutral-600">Carregando…</div>
            ) : items.length === 0 ? (
              <div className="mt-3 text-sm text-neutral-600">
                Seu carrinho está vazio (ou não há itens disponíveis).
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {items.map((it) => (
                  <div key={it.short_id} className="flex items-start justify-between gap-3 rounded-xl border p-4">
                    <div>
                      <div className="font-semibold">
                        {it.title || "Item"} <span className="font-mono text-sm">#{it.short_id}</span>
                      </div>
                      <div className="mt-1 text-sm text-neutral-600">
                        {(it.category || "").trim()}
                        {it.category ? " • " : ""}
                        {(it.condition || "").trim()}
                        {typeof it.price === "number" ? ` • ${formatBRL(it.price)}` : ""}
                        {it.status ? ` • ${it.status}` : ""}
                      </div>
                    </div>
                    <div className="font-semibold">
                      {typeof it.price === "number" ? formatBRL(it.price) : ""}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between border-t pt-3">
                  <div className="text-sm text-neutral-600">Total</div>
                  <div className="text-lg font-semibold">{formatBRL(total)}</div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">Seus dados</div>
              </div>
              <button
                type="button"
                onClick={fillSaved}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                Preencher com dados salvos
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">WhatsApp (obrigatório)</label>
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(DD) 9xxxx-xxxx"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">E-mail (obrigatório)</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>

              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  checked={optInMarketing}
                  onChange={(e) => setOptInMarketing(e.target.checked)}
                />
                Quero receber novidades e promoções (opcional).
              </label>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <div className="font-semibold">Como você prefere pagar?</div>

            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
                <input
                  type="radio"
                  name="paymentPlan"
                  value="pix_now"
                  checked={paymentPlan === "pix_now"}
                  onChange={() => setPaymentPlan("pix_now")}
                  className="mt-1"
                />
                <div>
                  <div className="font-semibold">Pix agora (valor total)</div>
                  <div className="text-sm text-neutral-600">
                    Recomendado para garantir a reserva e acertar a retirada no Tucxa2 pelo WhatsApp.
                    <br />
                    Pedidos com pagamentos não realizados em até 24 horas após a criação deles serão automaticamente cancelados.
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
                <input
                  type="radio"
                  name="paymentPlan"
                  value="card_pickup_deposit"
                  checked={paymentPlan === "card_pickup_deposit"}
                  onChange={() => setPaymentPlan("card_pickup_deposit")}
                  className="mt-1"
                />
                <div>
                  <div className="font-semibold">Cartão na retirada (caução PIX R$ 10,00)</div>
                  <div className="text-sm text-neutral-600">
                    Prazo máximo de 15 dias para acertar a retirada no Tucxa2 pelo WhatsApp. O valor da caução será devolvido na retirada/pagamento.
                  </div>
                </div>
              </label>
            </div>

            <div className="mt-5 rounded-xl border bg-neutral-50 p-4">
              <div className="font-semibold">Pix</div>
              <div className="mt-1 text-sm text-neutral-700">{PIX_FAVORED}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="rounded-lg border bg-white px-3 py-2 font-mono text-sm">{PIX_KEY}</div>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(PIX_KEY);
                  }}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-white"
                >
                  Copiar chave
                </button>
              </div>
              <div className="mt-2 text-sm text-neutral-600">
                Após criar o pedido, você poderá acompanhar todos os seus pedidos em um só lugar.
              </div>
            </div>

            <button
              type="button"
              onClick={() => void createOrder()}
              disabled={creating}
              className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {creating ? "Criando…" : "Criar pedido"}
            </button>
          </div>
        </>
      )}

      <CompleteSelection currentCart={cartSnapshot} excludeShortIds={purchasedShortIds} />

      <div className="rounded-xl border bg-white p-5">
        <div className="font-semibold">Informações Importantes</div>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
          <li>
            Pagamento por <b>Pix</b> ou <b>Cartão de Crédito</b> (para cartão: fazer um Pix de <b>R$ 10,00</b> para reserva; o valor é devolvido no pagamento/retirada).
          </li>
          <li>
            Retirada no <b>TUCXA2</b> (Rua Francisco de Assis Pupo, 390 — Vila Industrial — Campinas/SP) conforme data e horário combinado.
          </li>
          <li>
            <b>Não realizamos trocas.</b>
          </li>
        </ul>
      </div>
    </div>
  );
}

function OrderCompletionCard({
  created,
  okCode,
}: {
  created: CreateOrderSuccess | null;
  okCode: string;
}) {
  if (!created?.ok) {
    return (
      <div className="rounded-xl border bg-white p-5">
        <div className="font-semibold">Pedido criado ✅</div>
        <div className="mt-2 text-sm text-neutral-700">
          Código: <span className="font-mono font-semibold">{okCode}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link href="/meus-pedidos" className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
            Ver meus pedidos
          </Link>
          <Link href="/" className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
            Continuar comprando
          </Link>
        </div>
      </div>
    );
  }

  const { order, tracking } = created;
  const paymentLabel = paymentPlanLabel(order.payment_plan);
  const deadlineText = paymentDeadlineText(order);
  const nextStepText = paymentNextStepText(order);
  const whatsappLink = buildOrderWhatsappLink(order);

  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Pedido criado ✅</div>
          <p className="mt-1 text-sm text-neutral-600">
            Seu pedido já foi reservado. Agora é só seguir a orientação abaixo para pagamento e retirada.
          </p>
        </div>

        <Link href="/meus-pedidos" className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
          Ver meus pedidos
        </Link>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-neutral-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Código</div>
          <div className="mt-1 font-mono text-lg font-semibold">{order.code}</div>
        </div>

        <div className="rounded-xl border bg-neutral-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Pagamento</div>
          <div className="mt-1 font-semibold">{paymentLabel}</div>
        </div>

        <div className="rounded-xl border bg-neutral-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Prazo</div>
          <div className="mt-1 text-sm font-medium text-neutral-800">{deadlineText}</div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-emerald-50 p-4">
        <div className="font-semibold text-emerald-900">Próximo passo</div>
        <div className="mt-1 text-sm text-emerald-800">{nextStepText}</div>

        {shouldShowPixBox(order) && (
          <div className="mt-4 rounded-xl border bg-white p-4">
            <div className="font-semibold">Pix</div>
            <div className="mt-1 text-sm text-neutral-700">{PIX_FAVORED}</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="rounded-lg border bg-neutral-50 px-3 py-2 font-mono text-sm">{PIX_KEY}</div>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(PIX_KEY);
                }}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
              >
                Copiar chave
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl border p-4">
        <div className="font-semibold">Itens deste pedido</div>
        <div className="mt-3 space-y-3">
          {order.items.map((it) => (
            <div key={it.short_id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div>
                <div className="font-medium">{it.title || "Item"}</div>
                <div className="mt-1 text-sm text-neutral-600">#{it.short_id}</div>
              </div>
              <div className="font-semibold">{typeof it.price === "number" ? formatBRL(it.price) : ""}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <div className="text-sm text-neutral-600">Total do pedido</div>
          <div className="text-lg font-semibold">{formatBRL(order.total)}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
        >
          Enviar comprovante no WhatsApp
        </a>

        <Link href="/meus-pedidos" className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
          Acessar meus pedidos
        </Link>

        <Link href={tracking.url} className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
          Ver este pedido
        </Link>

        <Link href="/" className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
          Continuar comprando
        </Link>
      </div>
    </div>
  );
}

function CompleteSelection({
  currentCart,
  excludeShortIds,
}: {
  currentCart: string[];
  excludeShortIds: string[];
}) {
  const [list, setList] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(false);

  const excludeIds = useMemo(
    () => Array.from(new Set([...currentCart, ...excludeShortIds])).filter(Boolean),
    [currentCart, excludeShortIds]
  );

  const excludeKey = useMemo(() => excludeIds.join(","), [excludeIds]);

  useEffect(() => {
    let ignore = false;

    async function run() {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set("limit", "6");
        if (excludeKey) qs.set("exclude", excludeKey);

        const res = await fetch(`/api/public/recommendations?${qs.toString()}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as { items?: PublicItem[] };

        if (!ignore) setList(Array.isArray(data.items) ? data.items : []);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void run();

    return () => {
      ignore = true;
    };
  }, [excludeKey]);

  const filtered = useMemo(
    () =>
      list
        .filter((it) => it.status === "available" && !excludeIds.includes(it.short_id))
        .slice(0, 4),
    [list, excludeIds]
  );

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-5 text-sm text-neutral-600">
        Carregando sugestões…
      </div>
    );
  }

  if (filtered.length === 0) return null;

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold">Complete sua seleção</div>
          <div className="mt-1 text-sm text-neutral-600">
            Se fizer sentido, inclua mais 1 ou 2 itens — você economiza e ainda apoia a ação social do Bazar do Sementinha.
          </div>
        </div>

        <Link href="/" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50">
          Ver tudo no catálogo
        </Link>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {filtered.map((it) => (
          <div key={it.short_id} className="rounded-xl border p-4">
            <div className="font-semibold">{it.title || "Item"}</div>
            <div className="mt-1 text-sm text-neutral-600">
              {(it.category || "").trim()}
              {it.category ? " • " : ""}
              {(it.condition || "").trim()}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="font-semibold">{typeof it.price === "number" ? formatBRL(it.price) : ""}</div>

              <div className="flex items-center gap-2">
                <Link href={`/i/${it.short_id}`} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50">
                  Ver
                </Link>

                <AddToCartButton shortId={it.short_id} disabled={it.status !== "available"} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-neutral-600">Pronto para continuar comprando?</div>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
        >
          Ir para o topo
        </button>
      </div>
    </div>
  );
}
