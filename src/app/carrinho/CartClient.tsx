"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";

type ItemStatus = "review" | "available" | "reserved" | "sold";

type PublicItem = {
  id: string;
  short_id: string;
  title: string | null;
  category: string | null;
  condition: string | null;
  size: string | null;
  price: number | null;
  price_from: number | null;
  status: ItemStatus;
  created_at: string;
};

type ItemsResponse = { items: PublicItem[]; error?: string };
type RecoResponse = { items: PublicItem[]; error?: string };

function formatMoneyBR(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0,00";
  return value.toFixed(2).replace(".", ",");
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getCartIds(): string[] {
  const raw =
    typeof window !== "undefined"
      ? window.localStorage.getItem("bazar_cart")
      : null;
  const arr = safeJsonParse<unknown>(raw);
  if (!Array.isArray(arr)) return [];
  return arr.map(String).map((s) => s.trim()).filter(Boolean);
}

function setCartIds(ids: string[]) {
  window.localStorage.setItem("bazar_cart", JSON.stringify(ids));
  window.dispatchEvent(new Event("bazar_cart_updated"));
}

export default function CartClient() {
  const [cartIds, setCartIdsState] = useState<string[]>([]);
  const [items, setItems] = useState<PublicItem[]>([]);
  const [reco, setReco] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => {
    return items
      .filter((i) => i.status === "available")
      .reduce((sum, i) => sum + (i.price ?? 0), 0);
  }, [items]);

  const unavailableCount = useMemo(
    () => items.filter((i) => i.status !== "available").length,
    [items]
  );

  async function refreshAll(nextCartIds?: string[]) {
    setError(null);
    setLoading(true);
    const ids = nextCartIds ?? getCartIds();
    setCartIdsState(ids);

    try {
      // 1) Cart items
      if (!ids.length) {
        setItems([]);
      } else {
        const res = await fetch(
          `/api/public/items?short_ids=${encodeURIComponent(ids.join(","))}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as ItemsResponse;
        if (!res.ok || json.error)
          throw new Error(json.error || "Falha ao carregar itens do carrinho.");
        // Keep original cart order
        const byId = new Map(
          (json.items ?? []).map((it) => [it.short_id, it] as const)
        );
        setItems(
          ids
            .map((id) => byId.get(id))
            .filter((v): v is PublicItem => Boolean(v))
        );
      }

      // 2) Recommendations (exclude cart ids)
      const recoRes = await fetch(
        `/api/public/recommendations?exclude=${encodeURIComponent(
          ids.join(",")
        )}&limit=6`,
        { cache: "no-store" }
      );
      const recoJson = (await recoRes.json()) as RecoResponse;
      if (!recoRes.ok || recoJson.error)
        throw new Error(recoJson.error || "Falha ao carregar recomendações.");
      setReco(recoJson.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();

    const onCartUpdated = () => refreshAll();
    window.addEventListener("bazar_cart_updated", onCartUpdated);

    return () => window.removeEventListener("bazar_cart_updated", onCartUpdated);
  }, []);

  function removeFromCart(shortId: string) {
    const next = cartIds.filter((id) => id !== shortId);
    setCartIds(next);
    refreshAll(next);
  }

  function clearCart() {
    setCartIds([]);
    refreshAll([]);
  }

  return (
    <div className="mt-6">
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-gray-600">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-xl border bg-white p-5 text-sm text-gray-700">
          Seu carrinho está vazio.{" "}
          <Link href="/" className="underline">
            Voltar ao catálogo
          </Link>
          .
        </div>
      ) : (
        <>
          {unavailableCount > 0 ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Atenção: {unavailableCount} item(ns) do seu carrinho não
              está(ão) mais disponível(is). Remova e escolha outro(s) item(ns)
              do catálogo.
            </div>
          ) : null}

          <div className="space-y-4">
            {items.map((it) => (
              <div key={it.short_id} className="rounded-2xl border bg-white p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-base font-semibold">
                      {it.title ?? "Item do Bazar"}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {it.category ?? "Outros"} • {it.condition ?? "Muito bom"}
                      {it.size ? ` • Tam.: ${it.size}` : ""} •{" "}
                      <span className="font-semibold">
                        R$ {formatMoneyBR(it.price)}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        ID: #{it.short_id}
                      </span>
                    </div>
                    {it.status !== "available" ? (
                      <div className="mt-2 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        Status atual: {it.status}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/i/${encodeURIComponent(it.short_id)}`}
                      className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      Ver
                    </Link>
                    <button
                      className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() => removeFromCart(it.short_id)}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border bg-white p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-lg font-semibold">
                Total: R$ {formatMoneyBR(total)}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/"
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Continuar comprando
                </Link>
                <button
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                  onClick={clearCart}
                >
                  Limpar
                </button>
                <Link
                  href="/checkout"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Finalizar pedido
                </Link>
              </div>
            </div>
          </div>

          {/* Deep Dive: gentle cross-sell */}
          {reco.length ? (
            <section className="mt-8 rounded-2xl border bg-white p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold">
                    Complete sua seleção
                  </h2>
                  <p className="mt-1 text-sm text-gray-700">
                    Se fizer sentido, inclua mais 1 ou 2 itens — você economiza
                    e ainda apoia a ação social do Bazar do Sementinha.
                  </p>
                </div>
                <Link href="/" className="text-sm font-medium underline">
                  Ver tudo no catálogo
                </Link>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reco.map((it) => (
                  <div key={it.short_id} className="rounded-xl border p-4">
                    <div className="text-sm font-semibold line-clamp-2">
                      {it.title ?? "Item do Bazar"}
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      {it.category ?? "Outros"} • {it.condition ?? "Muito bom"}
                    </div>
                    <div className="mt-2 text-sm font-semibold">
                      R$ {formatMoneyBR(it.price)}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Link
                        href={`/i/${encodeURIComponent(it.short_id)}`}
                        className="rounded-lg border px-3 py-2 text-xs hover:bg-gray-50"
                      >
                        Ver
                      </Link>
                      <AddToCartButton
                        shortId={it.short_id}
                        disabled={it.status !== "available"}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-gray-700">Pronto para finalizar?</span>
                <Link
                  href="/checkout"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Ir para o checkout
                </Link>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}