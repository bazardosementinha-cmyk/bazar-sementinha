"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";

type ItemStatus = "review" | "available" | "reserved" | "sold";

type PublicItem = {
  short_id: string;
  title: string | null;
  category: string | null;
  condition: string | null;
  price: number | null;
  price_from: number | null;
  status: ItemStatus;
};

type ItemsResponse = { items: PublicItem[]; error?: string };
type CreateResponse = { ok?: boolean; error?: string; order_id?: string; whatsapp_url?: string; expires_at?: string };
type RecoResponse = { items: PublicItem[]; error?: string };

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function formatMoneyBR(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0,00";
  return value.toFixed(2).replace(".", ",");
}

function getCartIds(): string[] {
  const raw = typeof window !== "undefined" ? window.localStorage.getItem("bazar_cart") : null;
  const arr = safeJsonParse<unknown>(raw);
  if (!Array.isArray(arr)) return [];
  return arr.map(String).map((s) => s.trim()).filter(Boolean);
}

function setCartIds(ids: string[]) {
  window.localStorage.setItem("bazar_cart", JSON.stringify(ids));
  window.dispatchEvent(new Event("bazar_cart_updated"));
}

export default function CheckoutClient() {
  const [cartItems, setCartItems] = useState<PublicItem[]>([]);
  const [reco, setReco] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CreateResponse | null>(null);

  const availableItems = useMemo(() => cartItems.filter((x) => x.status === "available"), [cartItems]);

  const total = useMemo(
    () => availableItems.reduce((sum, it) => sum + (it.price ?? 0), 0),
    [availableItems]
  );

  async function loadCart() {
    setError(null);
    setLoading(true);
    try {
      const ids = getCartIds();

      if (!ids.length) {
        setCartItems([]);
        setReco([]);
        return;
      }

      const res = await fetch(`/api/public/items?short_ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" });
      const json = (await res.json()) as ItemsResponse;
      if (!res.ok || json.error) throw new Error(json.error || "Falha ao carregar itens.");
      // Keep original cart order
      const byId = new Map((json.items ?? []).map((it) => [it.short_id, it] as const));
      const ordered = ids.map((id) => byId.get(id)).filter((v): v is PublicItem => Boolean(v));
      setCartItems(ordered);

      // Recommendations
      const recoRes = await fetch(`/api/public/recommendations?exclude=${encodeURIComponent(ids.join(","))}&limit=6`, { cache: "no-store" });
      const recoJson = (await recoRes.json()) as RecoResponse;
      if (!recoRes.ok || recoJson.error) throw new Error(recoJson.error || "Falha ao carregar recomendações.");
      setReco(recoJson.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCart();
    const onCart = () => loadCart();
    window.addEventListener("bazar_cart_updated", onCart);
    return () => window.removeEventListener("bazar_cart_updated", onCart);
  }, []);

  function clearCart() {
    setCartIds([]);
    loadCart();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const cart_short_ids = availableItems.map((x) => x.short_id);

      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cart_short_ids,
          customer: {
            name: name.trim() || null,
            whatsapp: whatsapp.trim(),
            email: email.trim() || null,
            opt_in_marketing: optIn,
          },
        }),
      });

      const json = (await res.json()) as CreateResponse;
      if (!res.ok || json.error) throw new Error(json.error || "Falha ao criar pedido.");

      setSuccess(json);

      // Optional: clear cart after creating order
      setCartIds([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      {success?.ok ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Pedido criado com sucesso.{" "}
          {success.whatsapp_url ? (
            <a className="font-semibold underline" href={success.whatsapp_url} target="_blank" rel="noreferrer">
              Clique aqui para abrir o WhatsApp
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold">Itens</div>
          <button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" onClick={loadCart} type="button">
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="mt-3 text-sm text-gray-600">Carregando…</div>
        ) : availableItems.length === 0 ? (
          <div className="mt-3 text-sm text-gray-700">Seu carrinho está vazio (ou não há itens disponíveis).</div>
        ) : (
          <div className="mt-4 space-y-3">
            {availableItems.map((it) => (
              <div key={it.short_id} className="flex items-start justify-between gap-3 rounded-xl border p-4">
                <div>
                  <div className="text-sm font-semibold">
                    {it.title ?? "Item do Bazar"}{" "}
                    <span className="text-xs font-normal text-gray-500">#{it.short_id}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {it.category ?? "Outros"} • {it.condition ?? "Muito bom"} •{" "}
                    <span className="font-semibold">R$ {formatMoneyBR(it.price)}</span>
                  </div>
                </div>
                <div className="text-sm font-semibold">R$ {formatMoneyBR(it.price)}</div>
              </div>
            ))}

            <div className="flex items-center justify-between border-t pt-3">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-lg font-semibold">R$ {formatMoneyBR(total)}</div>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button className="text-sm underline" onClick={clearCart} type="button">
            Limpar carrinho
          </button>
          <Link href="/carrinho" className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
            Voltar ao carrinho
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-5">
        <div className="text-base font-semibold">Seus dados</div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Nome</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="text-sm font-medium">WhatsApp (obrigatório)</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(DD) 9xxxx-xxxx"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">E-mail (opcional)</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              type="email"
            />
          </div>

          <label className="sm:col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
            Quero receber novidades e promoções (opcional).
          </label>
        </div>

        <button
          className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          disabled={submitting || availableItems.length === 0}
          type="submit"
        >
          {submitting ? "Criando..." : "Criar pedido"}
        </button>
      </form>

      {/* Deep Dive: gentle cross-sell on checkout too */}
      {reco.length ? (
        <section className="rounded-2xl border bg-white p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Complete sua seleção</h2>
              <p className="mt-1 text-sm text-gray-700">
                Se fizer sentido, inclua mais 1 ou 2 itens — você economiza e ainda apoia a ação social do Bazar do Sementinha.
              </p>
            </div>
            <Link href="/" className="text-sm font-medium underline">
              Ver tudo no catálogo
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reco.map((it) => (
              <div key={it.short_id} className="rounded-xl border p-4">
                <div className="text-sm font-semibold line-clamp-2">{it.title ?? "Item do Bazar"}</div>
                <div className="mt-1 text-xs text-gray-600">
                  {it.category ?? "Outros"} • {it.condition ?? "Muito bom"}
                </div>
                <div className="mt-2 text-sm font-semibold">R$ {formatMoneyBR(it.price)}</div>

                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href={`/i/${encodeURIComponent(it.short_id)}`}
                    className="rounded-lg border px-3 py-2 text-xs hover:bg-gray-50"
                  >
                    Ver
                  </Link>
                  <AddToCartButton shortId={it.short_id} disabled={it.status !== "available"} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm text-gray-700">
            <Link href="/" className="font-medium underline">
              Continuar comprando
            </Link>
          </div>
        </section>
      ) : null}

      {/* Informações Importantes */}
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="text-base font-semibold">Informações Importantes</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-800">
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
      </section>
    </div>
  );
}