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

const CART_LS_KEY = "bazar_cart";

function readCart(): string[] {
  try {
    const raw = localStorage.getItem(CART_LS_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr.filter((x) => typeof x === "string") as string[]) : [];
  } catch {
    return [];
  }
}

function writeCart(ids: string[]) {
  localStorage.setItem(CART_LS_KEY, JSON.stringify(Array.from(new Set(ids))));
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CartClient() {
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [items, setItems] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCartIds(readCart());
  }, []);

  const total = useMemo(() => items.reduce((acc, it) => acc + (Number(it.price) || 0), 0), [items]);

  async function refresh() {
    const ids = readCart();
    setCartIds(ids);
    setError(null);

    if (ids.length === 0) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const qs = encodeURIComponent(ids.join(","));
      const res = await fetch(`/api/public/items?ids=${qs}`, { cache: "no-store" });
      const data = (await res.json()) as { items?: PublicItem[]; error?: string };
      if (!res.ok) throw new Error(data?.error || "Falha ao carregar itens.");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Erro ao carregar itens.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function removeOne(shortId: string) {
    const next = cartIds.filter((x) => x !== shortId);
    writeCart(next);
    setCartIds(next);
    setItems((prev) => prev.filter((it) => it.short_id !== shortId));
  }

  function clearCart() {
    writeCart([]);
    setCartIds([]);
    setItems([]);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {loading && <div className="text-sm text-neutral-600">Carregando…</div>}

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-xl border bg-white p-5">
            <div className="font-semibold">Itens</div>
            <div className="mt-2 text-sm text-neutral-600">Seu carrinho está vazio (ou não há itens disponíveis).</div>
          </div>
        ) : (
          items.map((it) => (
            <div key={it.short_id} className="rounded-xl border bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{it.title || "Item"}</div>
                  <div className="mt-1 text-sm text-neutral-600">
                    {(it.category || "").trim()}{it.category ? " • " : ""}{(it.condition || "").trim()}
                    {it.size ? ` • Tam.: ${it.size}` : ""}
                    {typeof it.price === "number" ? ` • ${formatBRL(it.price)}` : ""}
                    {it.short_id ? ` • ID: #${it.short_id}` : ""}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Link
                    href={`/i/${it.short_id}`}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50"
                  >
                    Ver
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeOne(it.short_id)}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-lg font-semibold">Total: {formatBRL(total)}</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={clearCart}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
            >
              Limpar
            </button>
            <Link href="/checkout" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700">
              Finalizar pedido
            </Link>
          </div>
        </div>
      </div>

      {/* Complete sua seleção (cross-sell) */}
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

        <SuggestedItems currentCart={cartIds} />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-neutral-600">Pronto para finalizar?</div>
          <Link href="/checkout" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700">
            Ir para o checkout
          </Link>
        </div>
      </div>
    </div>
  );
}

function SuggestedItems({ currentCart }: { currentCart: string[] }) {
  const [list, setList] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function run() {
      setLoading(true);
      try {
        const res = await fetch("/api/public/recommendations", { cache: "no-store" });
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
  }, []);

  const filtered = useMemo(() => list.filter((it) => it.status === "available" && !currentCart.includes(it.short_id)).slice(0, 4), [list, currentCart]);

  if (loading) return <div className="mt-4 text-sm text-neutral-600">Carregando sugestões…</div>;
  if (filtered.length === 0) return null;

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {filtered.map((it) => (
        <div key={it.short_id} className="rounded-xl border p-4">
          <div className="font-semibold">{it.title || "Item"}</div>
          <div className="mt-1 text-sm text-neutral-600">
            {(it.category || "").trim()}{it.category ? " • " : ""}{(it.condition || "").trim()}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="font-semibold">{typeof it.price === "number" ? formatBRL(it.price) : ""}</div>
            <div className="flex items-center gap-2">
              <Link
                href={`/i/${it.short_id}`}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                Ver
              </Link>
              <AddToCartButton shortId={it.short_id} disabled={it.status !== "available"} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
