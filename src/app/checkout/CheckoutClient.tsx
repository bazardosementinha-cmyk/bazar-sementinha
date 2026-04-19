"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatBRL } from "@/lib/utils";

type ItemRow = {
  id: string;
  short_id: string;
  title: string;
  category: string | null;
  condition: string | null;
  price: number | null;
  price_from: number | null;
  status: string;
};

function safeParseCart(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  } catch {
    // noop
  }
  return [];
}

function getCartIds(): string[] {
  return safeParseCart(localStorage.getItem("bazar_cart"));
}

function setCartIds(ids: string[]) {
  localStorage.setItem("bazar_cart", JSON.stringify(ids));
}

async function safeJson<T>(resp: Response): Promise<T> {
  const ct = resp.headers.get("content-type") || "";
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(text || `HTTP ${resp.status}`);
  }
  if (!ct.includes("application/json")) {
    // Ex.: middleware redirecionando para HTML
    throw new Error("Resposta inesperada (não-JSON).");
  }
  return JSON.parse(text) as T;
}

export default function CheckoutClient() {
  const router = useRouter();
  const search = useSearchParams();

  const buy = search.get("buy")?.trim() || "";

  const [ids, setIds] = useState<string[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [err, setErr] = useState<string>("");

  // dados do cliente (mantemos simples; backend decide o que é obrigatório)
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [optInMarketing, setOptInMarketing] = useState(false);

  const total = useMemo(() => {
    return items.reduce((acc, it) => acc + (typeof it.price === "number" ? it.price : 0), 0);
  }, [items]);

  // 1) Carrega carrinho do localStorage (e garante `buy` dentro dele)
  useEffect(() => {
    const current = getCartIds();
    const next = buy ? Array.from(new Set([buy, ...current])) : current;
    if (buy) setCartIds(next);
    setIds(next);
  }, [buy]);

  // 2) Busca itens do carrinho
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErr("");
      if (!ids.length) {
        setItems([]);
        return;
      }

      const q = encodeURIComponent(ids.join(","));
      const resp = await fetch(`/api/public/items?short_ids=${q}`, { cache: "no-store" });
      const data = await safeJson<{ items: ItemRow[] }>(resp);

      if (!cancelled) {
        setItems(Array.isArray(data.items) ? data.items : []);
      }
    }

    load().catch((e: unknown) => {
      if (cancelled) return;
      setItems([]);
      setErr(e instanceof Error ? e.message : String(e));
    });

    return () => {
      cancelled = true;
    };
  }, [ids]);

  const onClear = () => {
    setCartIds([]);
    setIds([]);
    setItems([]);
    router.push("/carrinho");
  };

  const onCreate = async () => {
    setErr("");
    if (!ids.length) {
      setErr("Seu carrinho está vazio.");
      return;
    }
    if (!name.trim()) {
      setErr("Informe seu nome.");
      return;
    }
    if (!whatsapp.trim()) {
      setErr("Informe seu WhatsApp.");
      return;
    }

    const payload = {
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim() || null,
      instagram: null, // WhatsApp-first
      optInMarketing,
      items: ids,
    };

    try {
      const resp = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeJson<{ ok: boolean; order_id?: string; wa_link?: string }>(resp);

      if (data.wa_link) {
        window.location.href = data.wa_link;
        return;
      }

      // fallback
      router.push("/checkout/sucesso");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finalizar pedido</h1>
          <p className="mt-1 text-slate-600">Confirmação e envio do comprovante pelo WhatsApp.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/carrinho")}
          className="rounded-2xl border bg-white px-4 py-2 font-semibold hover:bg-slate-50"
        >
          Voltar ao carrinho
        </button>
      </div>

      {err ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{err}</div> : null}

      <div className="mt-4 rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Itens</div>
          <button type="button" onClick={onClear} className="text-sm font-semibold text-slate-600 hover:underline">
            Limpar carrinho
          </button>
        </div>

        {items.length ? (
          <div className="mt-3 space-y-3">
            {items.map((it) => (
              <div key={it.id} className="flex items-start justify-between gap-3 rounded-xl border p-3">
                <div>
                  <div className="font-semibold">
                    {it.title} <span className="text-slate-500">#{it.short_id}</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {(it.category || "—")} • {(it.condition || "—")} • <span className="font-semibold">{it.status}</span>
                  </div>
                </div>
                <div className="text-right">
                  {it.price_from ? <div className="text-xs text-slate-500 line-through">{formatBRL(it.price_from)}</div> : null}
                  <div className="font-extrabold">{formatBRL(it.price || 0)}</div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <div className="font-semibold">Total</div>
              <div className="text-xl font-extrabold">{formatBRL(total)}</div>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-slate-600">Seu carrinho está vazio (ou não há itens disponíveis).</div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">WhatsApp</label>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="(DD) 9xxxx-xxxx"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-semibold">E-mail (opcional)</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="voce@exemplo.com"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={optInMarketing} onChange={(e) => setOptInMarketing(e.target.checked)} />
            Quero receber novidades e promoções (opcional).
          </label>
        </div>

        <button
          type="button"
          onClick={onCreate}
          className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-center font-semibold text-white hover:bg-emerald-700"
        >
          Criar pedido
        </button>
      </div>
    </div>
  );
}
