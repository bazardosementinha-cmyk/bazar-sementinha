"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";

type ItemStatus = "review" | "available" | "reserved" | "sold";

type Item = {
  id: string;
  short_id: string;
  title: string;
  category: string | null;
  condition: string | null;
  price: number;
  status: ItemStatus;
};

type PaymentPlan = "pix_now" | "card_pickup_deposit" | "pay_pickup_24h";

type CreateOrderResponse = {
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
  };
  pix: { key: string; favored: string };
  whatsapp_url: string;
};

const CART_LS_KEY = "bazar_cart";
const PIX_KEY = "58.392.598/0001-91";
const PIX_FAVORED = "Templo de Umbanda Caboclo Sete Flexa";
const SUPPORT_WA = "5519992360856";

function readCart(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_LS_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => typeof x === "string") as string[];
  } catch {
    return [];
  }
}

function writeCart(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_LS_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("storage"));
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function safeJson<T>(text: string): T {
  return JSON.parse(text) as T;
}

function waLink(text: string) {
  return `https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(text)}`;
}

export default function CheckoutClient() {
  const sp = useSearchParams();
  const buy = sp.get("buy");

  const [cartIds, setCartIds] = useState<string[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [optInMarketing, setOptInMarketing] = useState(false);

  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("pix_now");

  const [recommendations, setRecommendations] = useState<Item[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>("");
  const [created, setCreated] = useState<CreateOrderResponse | null>(null);

  // 1) Carrega carrinho + aplica "buy" (Comprar agora)
  useEffect(() => {
    const ids = readCart();
    if (buy && typeof window !== "undefined") {
      const next = Array.from(new Set([buy, ...ids]));
      writeCart(next);
      setCartIds(next);
    } else {
      setCartIds(ids);
    }
  }, [buy]);

  // 2) Carrega itens do carrinho
  useEffect(() => {
    const ids = cartIds;
    if (!ids.length) {
      setItems([]);
      return;
    }

    setLoadingItems(true);
    setError("");

    const qs = new URLSearchParams();
    qs.set("short_ids", ids.join(","));

    fetch(`/api/public/items?${qs.toString()}`, { cache: "no-store" })
      .then(async (r) => {
        const txt = await r.text();
        if (!r.ok) throw new Error(txt || "Falha ao carregar itens.");
        return safeJson<{ items: Item[] }>(txt);
      })
      .then((data) => setItems(data.items || []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoadingItems(false));
  }, [cartIds]);

  // 3) Carrega recomendações (Complete sua seleção)
  useEffect(() => {
    const exclude = cartIds;
    setLoadingRecs(true);

    const qs = new URLSearchParams();
    if (exclude.length) qs.set("exclude", exclude.join(","));

    fetch(`/api/public/recommendations?${qs.toString()}`, { cache: "no-store" })
      .then(async (r) => {
        const txt = await r.text();
        if (!r.ok) throw new Error(txt || "Falha ao carregar recomendações.");
        return safeJson<{ items: Item[] }>(txt);
      })
      .then((data) => setRecommendations(data.items || []))
      .catch(() => setRecommendations([]))
      .finally(() => setLoadingRecs(false));
  }, [cartIds]);

  const availableItems = useMemo(() => items.filter((it) => it.status === "available"), [items]);
  const total = useMemo(() => availableItems.reduce((sum, it) => sum + (Number(it.price) || 0), 0), [availableItems]);

  const onAutofill = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("bazar_customer");
      if (!raw) return;
      const data = safeJson<{ name?: string; whatsapp?: string; email?: string; optInMarketing?: boolean }>(raw);
      if (data.name) setCustomerName(data.name);
      if (data.whatsapp) setWhatsapp(data.whatsapp);
      if (data.email) setEmail(data.email);
      setOptInMarketing(Boolean(data.optInMarketing));
    } catch {
      // ignore
    }
  }, []);

  const onCreate = useCallback(async () => {
    setError("");
    setCreated(null);

    if (!customerName.trim()) {
      setError("Informe seu nome.");
      return;
    }

    if (!whatsapp.trim()) {
      setError("Informe seu WhatsApp.");
      return;
    }

    if (!availableItems.length) {
      setError("Seu carrinho está vazio (ou não há itens disponíveis).");
      return;
    }

    setCreating(true);

    try {
      const payload = {
        cart_short_ids: availableItems.map((it) => it.short_id),
        payment_plan: paymentPlan,
        customer: {
          name: customerName.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim() || undefined,
          opt_in_marketing: optInMarketing,
        },
      };

      const resp = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const txt = await resp.text();
      if (!resp.ok) throw new Error(txt || "Não foi possível criar o pedido.");

      const data = safeJson<CreateOrderResponse>(txt);
      setCreated(data);

      // salva dados
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "bazar_customer",
          JSON.stringify({
            name: payload.customer.name,
            whatsapp: payload.customer.whatsapp,
            email: payload.customer.email || "",
            optInMarketing: payload.customer.opt_in_marketing,
          })
        );
      }

      // limpa carrinho (pedido criado)
      writeCart([]);
      setCartIds([]);
      setItems([]);

      // abre WhatsApp já com mensagem pronta
      if (data.whatsapp_url) {
        window.open(data.whatsapp_url, "_blank");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }, [availableItems, paymentPlan, customerName, whatsapp, email, optInMarketing]);

  const planHint = useMemo(() => {
    if (paymentPlan === "pix_now") {
      return {
        title: "Pix agora (recomendado)",
        desc: "Você já paga o valor total e acelera a confirmação pelo WhatsApp. Prazo padrão: 24h.",
      };
    }

    if (paymentPlan === "card_pickup_deposit") {
      return {
        title: "Cartão na retirada (caução Pix R$ 10,00)",
        desc: "Faça um Pix de R$ 10,00 (caução) para segurar o pedido. Prazo máximo: 15 dias. A caução é devolvida na retirada/pagamento.",
      };
    }

    return {
      title: "Pagar na retirada (Pix ou cartão)",
      desc: "Você paga na retirada. Se não pagar em 24h, o pedido pode ser cancelado automaticamente.",
    };
  }, [paymentPlan]);

  const createdTotalStr = created ? formatBRL(created.order.total) : "";

  const receiptMessage = useMemo(() => {
    if (!created) return "";
    return `Olá! Segue o comprovante do Pix do pedido ${created.order.code}. Total: R$ ${createdTotalStr}.`;
  }, [created, createdTotalStr]);

  // UI
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Finalizar pedido</h1>
          <p className="text-sm text-muted-foreground">
            Informe seus dados para atendimento no <span className="font-medium">WhatsApp</span>. Promoções só com consentimento.
          </p>
        </div>
        <Link href="/carrinho" className="text-sm rounded-full border px-4 py-2 hover:bg-white">
          Voltar ao carrinho
        </Link>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {created ? (
        <div className="mt-6 rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-muted-foreground">Pedido criado</div>
              <div className="text-xl font-semibold">#{created.order.code}</div>
            </div>
            <a
              href={created.whatsapp_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-4 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Abrir WhatsApp
            </a>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border p-4">
              <div className="font-semibold">Pagamento</div>
              <div className="text-sm text-muted-foreground mt-1">{planHint.title}</div>
              <div className="text-sm mt-2">Total: <span className="font-medium">R$ {createdTotalStr}</span></div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="font-semibold">Pix</div>
              <div className="text-sm text-muted-foreground mt-1">{created.pix.favored}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="rounded bg-gray-50 px-2 py-1 text-sm">{created.pix.key}</code>
                <button
                  type="button"
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => navigator.clipboard.writeText(created.pix.key)}
                >
                  Copiar chave
                </button>
              </div>
              <div className="mt-3">
                <a
                  href={waLink(receiptMessage)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-lg px-3 py-2 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800"
                >
                  Enviar comprovante no WhatsApp
                </a>
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Dica: você pode continuar comprando e fazer novos pedidos (um por vez) se preferir.
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              Ver catálogo
            </Link>
            <Link href="/carrinho" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              Ir ao carrinho
            </Link>
          </div>
        </div>
      ) : null}

      {/* Itens */}
      {!created ? (
        <div className="mt-6 rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold">Itens</div>
            <button
              type="button"
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => setCartIds(readCart())}
              disabled={loadingItems}
            >
              Atualizar
            </button>
          </div>

          {loadingItems ? (
            <div className="mt-3 text-sm text-muted-foreground">Carregando…</div>
          ) : availableItems.length ? (
            <div className="mt-3 grid gap-2">
              {availableItems.map((it) => (
                <div key={it.id} className="flex items-start justify-between gap-3 rounded-xl border p-4">
                  <div>
                    <div className="font-medium">{it.title} <span className="text-muted-foreground">#{it.short_id}</span></div>
                    <div className="text-sm text-muted-foreground">
                      {(it.category || "Outros") + " • " + (it.condition || "")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">R$ {formatBRL(Number(it.price) || 0)}</div>
                  </div>
                </div>
              ))}

              <div className="mt-1 flex items-center justify-between px-1">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-lg font-semibold">R$ {formatBRL(total)}</div>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">Seu carrinho está vazio (ou não há itens disponíveis).</div>
          )}

          <div className="mt-3">
            <button
              type="button"
              className="text-sm text-slate-700 hover:underline"
              onClick={() => {
                writeCart([]);
                setCartIds([]);
                setItems([]);
              }}
            >
              Limpar carrinho
            </button>
          </div>
        </div>
      ) : null}

      {/* Seus dados */}
      {!created ? (
        <div className="mt-6 rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold">Seus dados</div>
            <button
              type="button"
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={onAutofill}
            >
              Preencher com dados salvos
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label className="text-sm font-medium">WhatsApp (obrigatório)</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(DD) 9xxxx-xxxx"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">E-mail (opcional)</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>

            <label className="md:col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={optInMarketing} onChange={(e) => setOptInMarketing(e.target.checked)} />
              Quero receber novidades e promoções (opcional).
            </label>
          </div>
        </div>
      ) : null}

      {/* Pagamento */}
      {!created ? (
        <div className="mt-6 rounded-2xl border bg-white p-5">
          <div className="font-semibold">Como você prefere pagar?</div>
          <div className="mt-3 grid gap-3">
            <label className="flex gap-3 rounded-xl border p-4 cursor-pointer">
              <input
                type="radio"
                name="payment"
                value="pix_now"
                checked={paymentPlan === "pix_now"}
                onChange={() => setPaymentPlan("pix_now")}
              />
              <div>
                <div className="font-medium">Pix agora (valor total)</div>
                <div className="text-sm text-muted-foreground">Recomendado para confirmar rápido. Prazo padrão: 24h.</div>
              </div>
            </label>

            <label className="flex gap-3 rounded-xl border p-4 cursor-pointer">
              <input
                type="radio"
                name="payment"
                value="card_pickup_deposit"
                checked={paymentPlan === "card_pickup_deposit"}
                onChange={() => setPaymentPlan("card_pickup_deposit")}
              />
              <div>
                <div className="font-medium">Cartão na retirada (caução Pix R$ 10,00)</div>
                <div className="text-sm text-muted-foreground">Prazo máximo: 15 dias. Caução devolvida na retirada/pagamento.</div>
              </div>
            </label>

            <label className="flex gap-3 rounded-xl border p-4 cursor-pointer">
              <input
                type="radio"
                name="payment"
                value="pay_pickup_24h"
                checked={paymentPlan === "pay_pickup_24h"}
                onChange={() => setPaymentPlan("pay_pickup_24h")}
              />
              <div>
                <div className="font-medium">Pagar na retirada (Pix ou cartão)</div>
                <div className="text-sm text-muted-foreground">Se não pagar em 24h, o pedido pode ser cancelado automaticamente.</div>
              </div>
            </label>
          </div>

          <div className="mt-4 rounded-xl border p-4">
            <div className="font-semibold">Pix</div>
            <div className="text-sm text-muted-foreground">{PIX_FAVORED}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded bg-gray-50 px-2 py-1 text-sm">{PIX_KEY}</code>
              <button
                type="button"
                className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => navigator.clipboard.writeText(PIX_KEY)}
              >
                Copiar chave
              </button>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Após criar o pedido, você verá o código e poderá enviar o comprovante no WhatsApp com 1 clique.
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              className={
                "w-full rounded-xl px-4 py-3 text-sm font-medium " +
                (creating
                  ? "bg-gray-200 text-gray-600"
                  : "bg-emerald-600 text-white hover:bg-emerald-700")
              }
              onClick={onCreate}
              disabled={creating}
            >
              {creating ? "Criando pedido…" : "Criar pedido"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Complete sua seleção (Deep Dive leve) */}
      {!created ? (
        <div className="mt-6 rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Complete sua seleção</div>
              <div className="text-sm text-muted-foreground">Se fizer sentido, inclua mais 1 ou 2 itens — você economiza e ainda apoia a ação social do Bazar do Sementinha.</div>
            </div>
            <Link href="/" className="text-sm rounded-full border px-4 py-2 hover:bg-gray-50">
              Ver tudo no catálogo
            </Link>
          </div>

          {loadingRecs ? (
            <div className="mt-3 text-sm text-muted-foreground">Carregando…</div>
          ) : recommendations.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {recommendations.slice(0, 4).map((it) => (
                <div key={it.id} className="rounded-xl border p-4">
                  <div className="font-medium">{it.title}</div>
                  <div className="text-sm text-muted-foreground">{(it.category || "Outros") + " • " + (it.condition || "")}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="font-semibold">R$ {formatBRL(Number(it.price) || 0)}</div>
                    <div className="flex items-center gap-2">
                      <Link href={`/i/${it.short_id}`} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Ver</Link>
                      <AddToCartButton shortId={it.short_id} status={it.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">Sem recomendações no momento.</div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">Pronto para finalizar?</div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="rounded-lg px-3 py-2 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800"
            >
              Ir para o topo
            </a>
          </div>
        </div>
      ) : null}

      {/* Informações importantes */}
      <div className="mt-6 rounded-2xl border bg-white p-5">
        <div className="font-semibold">Informações Importantes</div>
        <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>
            Pagamento por <span className="font-medium text-slate-900">Pix</span> ou <span className="font-medium text-slate-900">Cartão de Crédito</span> (para cartão: fazer um Pix de <span className="font-medium text-slate-900">R$ 10,00</span> para reserva; o valor é devolvido no pagamento/retirada).
          </li>
          <li>
            Retirada no <span className="font-medium text-slate-900">TUCXA2</span> (Rua Francisco de Assis Pupo, 390 – Vila Industrial – Campinas/SP) conforme data e horário combinado.
          </li>
          <li>
            <span className="font-medium text-slate-900">Não realizamos trocas.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
