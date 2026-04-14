"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  short_id: string;
  title: string;
  category: string;
  condition: string;
  size: string | null;
  price: number;
  price_from: number | null;
  status: string;
};

function notifyCartUpdated() {
  window.dispatchEvent(new Event("bazar_cart_updated"));
}

function getCart(): string[] {
  try {
    const raw = localStorage.getItem("bazar_cart");
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => typeof x === "string");
  } catch {
    return [];
  }
}

function setCart(ids: string[]) {
  localStorage.setItem("bazar_cart", JSON.stringify(ids));
  notifyCartUpdated();
}

export default function CarrinhoPage() {
  const [ids, setIds] = useState<string[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const c = getCart();
    setIds(c);
  }, []);

  useEffect(() => {
    async function load() {
      setErr(null);
      if (!ids.length) {
        setItems([]);
        return;
      }
      const resp = await fetch(`/api/public/items?short_ids=${encodeURIComponent(ids.join(","))}`);
      const data = await resp.json();
      if (!resp.ok) {
        setErr(data?.error || "Falha ao carregar carrinho");
        return;
      }
      setItems((data.items ?? []) as Item[]);
    }
    void load();
  }, [ids]);

  const total = useMemo(() => items.reduce((s, i) => s + Number(i.price ?? 0), 0), [items]);

  function remove(shortId: string) {
    const next = ids.filter((x) => x !== shortId);
    setIds(next);
    setCart(next);
  }

  function clear() {
    setIds([]);
    setItems([]);
    setCart([]);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold">Carrinho</h1>

      {!ids.length ? (
        <div className="mt-4 rounded-2xl border bg-white p-6 text-slate-600">
          Seu carrinho está vazio. <Link className="underline" href="/">Voltar ao catálogo</Link>
        </div>
      ) : (
        <>
          {err ? <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}

          <div className="mt-4 space-y-3">
            {items.map((i) => (
              <div key={i.short_id} className="rounded-2xl border bg-white p-4 flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{i.title}</div>
                  <div className="text-sm text-slate-600">
                    {i.category} • {i.condition}{i.size ? ` • Tam.: ${i.size}` : ""} • <b>R$ {Number(i.price).toFixed(2).replace(".", ",")}</b>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">ID: #{i.short_id}</div>
                </div>
                <button onClick={() => remove(i.short_id)} className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50">
                  Remover
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border bg-white p-4 flex items-center justify-between">
            <div className="text-lg font-bold">Total: R$ {total.toFixed(2).replace(".", ",")}</div>
            <div className="flex gap-2">
              <button onClick={clear} className="rounded-xl border px-4 py-2 hover:bg-slate-50">
                Limpar
              </button>
              <Link href="/checkout" className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">
                Finalizar pedido
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
